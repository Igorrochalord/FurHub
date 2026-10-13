"""Rotas públicas e do portal (participante, artista, voluntário)."""

import json
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import current_user, optional_user, require_roles, visible_event
from ..models import (
    Achievement,
    Application,
    CareRequest,
    Event,
    Favorite,
    Fursona,
    Notification,
    Place,
    ScheduleItem,
    Shift,
    ShiftAssignment,
    Signup,
    Ticket,
    TicketType,
    User,
    UserAchievement,
)
from ..schemas import (
    ApplicationIn,
    ApplicationOut,
    ArtistPublicOut,
    CareRequestIn,
    CareRequestOut,
    ClaimIn,
    EventOut,
    FursonaIn,
    FursonaOut,
    NotificationOut,
    PassportItemOut,
    PlaceOut,
    PurchaseIn,
    ScheduleOut,
    ShiftMember,
    ShiftOut,
    TicketOut,
    TicketTypeOut,
)
from ..services.ticketing import MAX_TICKETS_PER_USER, issue_ticket  # noqa: F401

router = APIRouter(prefix="/api", tags=["portal"])


# ---------- public ----------
@router.get("/events", response_model=list[EventOut])
def public_events(db: Session = Depends(get_db)):
    return db.scalars(select(Event).where(Event.status == "published").order_by(Event.start_date)).all()


def _sold(db: Session, type_id: int) -> int:
    return db.scalar(select(func.count(Ticket.id)).where(Ticket.ticket_type_id == type_id, Ticket.status != "cancelled"))


@router.get("/events/{event_id}")
def public_event(ev: Event = Depends(visible_event), db: Session = Depends(get_db)):
    types = db.scalars(select(TicketType).where(TicketType.event_id == ev.id, TicketType.active).order_by(TicketType.price_cents)).all()
    out = []
    for t in types:
        o = TicketTypeOut.model_validate(t)
        o.sold = _sold(db, t.id)
        out.append(o)
    return {"event": EventOut.model_validate(ev), "ticket_types": out}


@router.get("/events/{event_id}/schedule", response_model=list[ScheduleOut])
def schedule(ev: Event = Depends(visible_event), user: User | None = Depends(optional_user), db: Session = Depends(get_db)):
    items = db.scalars(select(ScheduleItem).where(ScheduleItem.event_id == ev.id).order_by(ScheduleItem.starts_at)).all()
    counts = dict(
        db.execute(
            select(Signup.item_id, func.count()).join(ScheduleItem, ScheduleItem.id == Signup.item_id)
            .where(ScheduleItem.event_id == ev.id).group_by(Signup.item_id)
        ).all()
    )
    favs = signed = set()
    if user:
        ids = [i.id for i in items]
        favs = set(db.scalars(select(Favorite.item_id).where(Favorite.user_id == user.id, Favorite.item_id.in_(ids))))
        signed = set(db.scalars(select(Signup.item_id).where(Signup.user_id == user.id, Signup.item_id.in_(ids))))
    out = []
    for i in items:
        o = ScheduleOut.model_validate(i)
        o.signups = counts.get(i.id, 0)
        o.spots_left = max(i.capacity - o.signups, 0) if i.capacity else None
        o.favorited, o.signed_up = i.id in favs, i.id in signed
        out.append(o)
    return out


@router.get("/events/{event_id}/places", response_model=list[PlaceOut])
def places(ev: Event = Depends(visible_event), db: Session = Depends(get_db)):
    return db.scalars(select(Place).where(Place.event_id == ev.id).order_by(Place.kind, Place.name)).all()


@router.get("/events/{event_id}/artists", response_model=list[ArtistPublicOut])
def artists(ev: Event = Depends(visible_event), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Application).where(Application.event_id == ev.id, Application.status == "approved").order_by(Application.display_name)
    ).all()
    return [
        ArtistPublicOut(id=a.id, kind=a.kind, display_name=a.display_name, description=a.description,
                        portfolio_url=a.portfolio_url, table_label=a.table_label)
        for a in rows
    ]


CARE_KINDS = ("lounge", "hydration", "rest", "medical")


@router.get("/events/{event_id}/care")
def care_info(ev: Event = Depends(visible_event), db: Session = Depends(get_db)):
    spots = db.scalars(select(Place).where(Place.event_id == ev.id, Place.kind.in_(CARE_KINDS)).order_by(Place.kind, Place.name)).all()
    parades = db.scalars(
        select(ScheduleItem).where(ScheduleItem.event_id == ev.id, ScheduleItem.kind == "parade").order_by(ScheduleItem.starts_at)
    ).all()
    return {
        "guidelines": ev.care_guidelines,
        "spots": [PlaceOut.model_validate(p) for p in spots],
        "parades": [ScheduleOut.model_validate(p) for p in parades],
    }


# ---------- tickets ----------
def _ticket_out(db: Session, t: Ticket) -> TicketOut:
    tt, ev = db.get(TicketType, t.ticket_type_id), db.get(Event, t.event_id)
    o = TicketOut.model_validate(t)
    o.ticket_type_name, o.event_name, o.is_vip = tt.name, ev.name, tt.is_vip
    return o




@router.post("/events/{event_id}/purchase", response_model=TicketOut, status_code=201)
def purchase(body: PurchaseIn, ev: Event = Depends(visible_event), user: User = Depends(current_user), db: Session = Depends(get_db)):
    t = issue_ticket(db, ev, body.ticket_type_id, body.badge_name, body.payment_method, user_id=user.id)
    db.commit()
    return _ticket_out(db, t)


@router.get("/me/tickets", response_model=list[TicketOut])
def my_tickets(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(Ticket).where(Ticket.user_id == user.id, Ticket.status != "cancelled").order_by(Ticket.created_at.desc())).all()
    return [_ticket_out(db, t) for t in rows]


@router.post("/me/tickets/{ticket_id}/rotate", response_model=TicketOut)
def rotate_code(ticket_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Gera um novo código de QR (invalida o anterior) caso a imagem tenha vazado."""
    t = db.get(Ticket, ticket_id)
    if not t or t.user_id != user.id:
        raise HTTPException(404, "Ingresso não encontrado")
    if t.status != "valid":
        raise HTTPException(409, "Somente ingressos ainda não utilizados podem ter o QR renovado")
    t.code = secrets.token_urlsafe(16)
    db.commit()
    return _ticket_out(db, t)


@router.get("/me/events", response_model=list[EventOut])
def my_events(user: User = Depends(current_user), db: Session = Depends(get_db)):
    ids = set(db.scalars(select(Ticket.event_id).where(Ticket.user_id == user.id, Ticket.status != "cancelled")))
    ids |= set(db.scalars(select(Application.event_id).where(Application.user_id == user.id)))
    return db.scalars(select(Event).where(Event.id.in_(ids)).order_by(Event.start_date)).all() if ids else []


def _has_ticket(db: Session, user: User, event_id: int) -> bool:
    return db.scalar(
        select(Ticket.id).where(Ticket.event_id == event_id, Ticket.user_id == user.id, Ticket.status != "cancelled").limit(1)
    ) is not None


# ---------- fursona ----------
@router.get("/me/fursona", response_model=FursonaOut | None)
def get_fursona(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.scalar(select(Fursona).where(Fursona.user_id == user.id))


@router.put("/me/fursona", response_model=FursonaOut)
def put_fursona(body: FursonaIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    f = db.scalar(select(Fursona).where(Fursona.user_id == user.id))
    if not f:
        f = Fursona(user_id=user.id, **body.model_dump())
        db.add(f)
    else:
        for k, v in body.model_dump().items():
            setattr(f, k, v)
    db.commit()
    return f


# ---------- favorites / signups ----------
def _item(db: Session, ev: Event, item_id: int) -> ScheduleItem:
    item = db.get(ScheduleItem, item_id)
    if not item or item.event_id != ev.id:
        raise HTTPException(404, "Atividade não encontrada")
    return item


@router.post("/events/{event_id}/schedule/{item_id}/favorite", status_code=204)
def favorite(item_id: int, ev: Event = Depends(visible_event), user: User = Depends(current_user), db: Session = Depends(get_db)):
    item = _item(db, ev, item_id)
    if not db.scalar(select(Favorite.id).where(Favorite.user_id == user.id, Favorite.item_id == item.id)):
        db.add(Favorite(user_id=user.id, item_id=item.id))
        db.commit()


@router.delete("/events/{event_id}/schedule/{item_id}/favorite", status_code=204)
def unfavorite(item_id: int, ev: Event = Depends(visible_event), user: User = Depends(current_user), db: Session = Depends(get_db)):
    item = _item(db, ev, item_id)
    f = db.scalar(select(Favorite).where(Favorite.user_id == user.id, Favorite.item_id == item.id))
    if f:
        db.delete(f)
        db.commit()


@router.post("/events/{event_id}/schedule/{item_id}/signup", status_code=204)
def signup(item_id: int, ev: Event = Depends(visible_event), user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not _has_ticket(db, user, ev.id):
        raise HTTPException(403, "É necessário ter um ingresso do evento para se inscrever")
    item = db.scalar(select(ScheduleItem).where(ScheduleItem.id == item_id, ScheduleItem.event_id == ev.id).with_for_update())
    if not item:
        raise HTTPException(404, "Atividade não encontrada")
    if db.scalar(select(Signup.id).where(Signup.user_id == user.id, Signup.item_id == item.id)):
        return
    if item.capacity and db.scalar(select(func.count(Signup.id)).where(Signup.item_id == item.id)) >= item.capacity:
        raise HTTPException(409, "Vagas esgotadas nesta atividade")
    db.add(Signup(user_id=user.id, item_id=item.id))
    db.commit()


@router.delete("/events/{event_id}/schedule/{item_id}/signup", status_code=204)
def cancel_signup(item_id: int, ev: Event = Depends(visible_event), user: User = Depends(current_user), db: Session = Depends(get_db)):
    item = _item(db, ev, item_id)
    s = db.scalar(select(Signup).where(Signup.user_id == user.id, Signup.item_id == item.id))
    if s:
        db.delete(s)
        db.commit()


# ---------- notifications ----------
@router.get("/me/notifications", response_model=list[NotificationOut])
def notifications(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.scalars(select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(100)).all()


@router.post("/me/notifications/read", status_code=204)
def mark_read(user: User = Depends(current_user), db: Session = Depends(get_db)):
    for n in db.scalars(select(Notification).where(Notification.user_id == user.id, ~Notification.read)):
        n.read = True
    db.commit()


# ---------- passport ----------
@router.get("/events/{event_id}/passport")
def passport(ev: Event = Depends(visible_event), user: User = Depends(current_user), db: Session = Depends(get_db)):
    earned = dict(
        db.execute(
            select(UserAchievement.achievement_id, UserAchievement.earned_at)
            .join(Achievement, Achievement.id == UserAchievement.achievement_id)
            .where(UserAchievement.user_id == user.id, Achievement.event_id == ev.id)
        ).all()
    )
    items = [
        PassportItemOut(id=a.id, name=a.name, description=a.description, category=a.category, points=a.points,
                        earned=a.id in earned, earned_at=earned.get(a.id))
        for a in db.scalars(select(Achievement).where(Achievement.event_id == ev.id).order_by(Achievement.id))
    ]
    return {"points": sum(i.points for i in items if i.earned), "total_points": sum(i.points for i in items), "items": items}


@router.post("/events/{event_id}/passport/claim", response_model=PassportItemOut)
def claim(body: ClaimIn, ev: Event = Depends(visible_event), user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not _has_ticket(db, user, ev.id):
        raise HTTPException(403, "É necessário ter um ingresso do evento")
    code = body.code.strip().lower()
    a = db.scalar(select(Achievement).where(Achievement.event_id == ev.id, func.lower(Achievement.claim_code) == code))
    if not a:
        raise HTTPException(404, "Código inválido")
    ua = db.scalar(select(UserAchievement).where(UserAchievement.user_id == user.id, UserAchievement.achievement_id == a.id))
    if not ua:
        ua = UserAchievement(user_id=user.id, achievement_id=a.id)
        db.add(ua)
        db.commit()
    return PassportItemOut(id=a.id, name=a.name, description=a.description, category=a.category, points=a.points,
                           earned=True, earned_at=ua.earned_at)


# ---------- fursuit care requests ----------
@router.post("/events/{event_id}/care-requests", response_model=CareRequestOut, status_code=201)
def request_care(body: CareRequestIn, ev: Event = Depends(visible_event), user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not _has_ticket(db, user, ev.id):
        raise HTTPException(403, "É necessário ter um ingresso do evento")
    open_n = db.scalar(select(func.count(CareRequest.id)).where(CareRequest.event_id == ev.id, CareRequest.user_id == user.id, CareRequest.status != "resolved"))
    if open_n >= 3:
        raise HTTPException(409, "Você já tem solicitações em aberto. Aguarde o atendimento.")
    r = CareRequest(event_id=ev.id, user_id=user.id, **body.model_dump())
    db.add(r)
    db.commit()
    return CareRequestOut.model_validate(r)


@router.get("/events/{event_id}/care-requests/mine", response_model=list[CareRequestOut])
def my_care(ev: Event = Depends(visible_event), user: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.scalars(select(CareRequest).where(CareRequest.event_id == ev.id, CareRequest.user_id == user.id).order_by(CareRequest.created_at.desc())).all()


# ---------- artist applications ----------
@router.post("/events/{event_id}/applications", response_model=ApplicationOut, status_code=201)
def apply(body: ApplicationIn, ev: Event = Depends(visible_event), user: User = Depends(require_roles("artist")), db: Session = Depends(get_db)):
    if db.scalar(select(Application.id).where(Application.event_id == ev.id, Application.user_id == user.id)):
        raise HTTPException(409, "Você já se inscreveu neste evento")
    a = Application(event_id=ev.id, user_id=user.id, **body.model_dump())
    db.add(a)
    db.commit()
    o = ApplicationOut.model_validate(a)
    o.event_name = ev.name
    return o


@router.get("/me/applications", response_model=list[ApplicationOut])
def my_applications(user: User = Depends(require_roles("artist")), db: Session = Depends(get_db)):
    rows = db.execute(
        select(Application, Event.name).join(Event, Event.id == Application.event_id)
        .where(Application.user_id == user.id).order_by(Application.created_at.desc())
    ).all()
    out = []
    for a, name in rows:
        o = ApplicationOut.model_validate(a)
        o.event_name = name
        out.append(o)
    return out


# ---------- volunteer shifts ----------
@router.get("/me/shifts", response_model=list[ShiftOut])
def my_shifts(user: User = Depends(require_roles("volunteer", "admin")), db: Session = Depends(get_db)):
    rows = db.execute(
        select(Shift, ShiftAssignment.confirmed, Event.name)
        .join(ShiftAssignment, ShiftAssignment.shift_id == Shift.id)
        .join(Event, Event.id == Shift.event_id)
        .where(ShiftAssignment.user_id == user.id).order_by(Shift.starts_at)
    ).all()
    out = []
    for s, confirmed, ename in rows:
        mates = db.execute(
            select(ShiftAssignment, User.name).join(User, User.id == ShiftAssignment.user_id).where(ShiftAssignment.shift_id == s.id)
        ).all()
        out.append(ShiftOut(
            id=s.id, event_id=s.event_id, event_name=ename, title=s.title, area=s.area, starts_at=s.starts_at,
            ends_at=s.ends_at, slots=s.slots, confirmed=confirmed,
            members=[ShiftMember(user_id=a.user_id, name=n, confirmed=a.confirmed) for a, n in mates],
        ))
    return out


@router.post("/me/shifts/{shift_id}/confirm", status_code=204)
def confirm_shift(shift_id: int, user: User = Depends(require_roles("volunteer", "admin")), db: Session = Depends(get_db)):
    a = db.scalar(select(ShiftAssignment).where(ShiftAssignment.shift_id == shift_id, ShiftAssignment.user_id == user.id))
    if not a:
        raise HTTPException(404, "Turno não encontrado")
    a.confirmed = True
    db.commit()


# ---------- privacy (LGPD) ----------
@router.get("/me/export")
def export_data(user: User = Depends(current_user), db: Session = Depends(get_db)):
    def rows(model, col=None):
        col = col or model.user_id
        return [{c.name: str(getattr(r, c.name)) for c in model.__table__.columns} for r in db.scalars(select(model).where(col == user.id))]

    data = {
        "user": {"id": user.id, "email": user.email, "name": user.name, "role": user.role,
                 "privacy_accepted_at": str(user.privacy_accepted_at), "created_at": str(user.created_at)},
        "fursona": rows(Fursona),
        "tickets": [{k: v for k, v in r.items() if k != "code"} for r in rows(Ticket)],
        "applications": rows(Application),
        "favorites": rows(Favorite),
        "signups": rows(Signup),
        "achievements": rows(UserAchievement),
        "care_requests": rows(CareRequest),
        "notifications": rows(Notification),
    }
    return json.loads(json.dumps(data))


@router.delete("/me", status_code=204)
def delete_account(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Exclui a conta. Ingressos pagos permanecem anonimizados por obrigação contábil."""
    if user.role in ("admin", "volunteer"):
        raise HTTPException(409, "Contas de equipe devem ser removidas por um administrador da organização")
    for t in db.scalars(select(Ticket).where(Ticket.user_id == user.id)):
        t.user_id = None
        t.badge_name = "Anônimo"
        t.code = secrets.token_urlsafe(16)
    db.delete(user)  # demais dados pessoais caem em cascata
    db.commit()

