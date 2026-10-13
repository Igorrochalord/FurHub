"""Painel dos organizadores: eventos, ingressos, check-in, programação, mapa, Care e conquistas."""

import secrets
import time

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import admin_event, admin_user, staff_event, staff_user
from ..models import (
    Achievement,
    Announcement,
    CareRequest,
    Event,
    Favorite,
    Place,
    ScheduleItem,
    Signup,
    Ticket,
    TicketType,
    User,
    UserAchievement,
    utcnow,
)
from ..schemas import (
    AchievementAdminOut,
    AchievementIn,
    AnnouncementIn,
    AnnouncementOut,
    AttendeeOut,
    CareRequestOut,
    CareStatusIn,
    CheckinIn,
    CheckinOut,
    EventIn,
    EventOut,
    EventStatusIn,
    PlaceIn,
    PlaceOut,
    ScheduleIn,
    ScheduleOut,
    TicketTypeIn,
    TicketTypeOut,
)
from ..services.geocode import geocode
from ..services.notify import event_audience, notify_users
from ..services.slugs import assign_slug

router = APIRouter(prefix="/api/org", tags=["organizer"])


# ---------- events ----------
_GEO_HITS: dict[int, list[float]] = {}


@router.get("/geocode")
def geocode_address(q: str = Query(min_length=3, max_length=200), user: User = Depends(admin_user), db: Session = Depends(get_db)):
    """Sugestões de coordenadas para um endereço (cache em banco; limite por usuário)."""
    now = time.time()
    hits = [t for t in _GEO_HITS.get(user.id, []) if now - t < 60]
    if len(hits) >= 10:
        raise HTTPException(429, "Muitas buscas de endereço. Aguarde um minuto.")
    _GEO_HITS[user.id] = hits + [now]
    try:
        return {"results": geocode(db, q)}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, "Serviço de geocodificação indisponível. Posicione o marcador manualmente no mapa.") from exc


@router.get("/events", response_model=list[EventOut])
def list_events(user: User = Depends(staff_user), db: Session = Depends(get_db)):
    return db.scalars(select(Event).where(Event.organization_id == user.organization_id).order_by(Event.start_date.desc())).all()


@router.post("/events", response_model=EventOut, status_code=201)
def create_event(body: EventIn, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    ev = Event(organization_id=user.organization_id, **body.model_dump())
    db.add(ev)
    db.flush()
    assign_slug(db, ev)
    db.commit()
    return ev


@router.get("/events/{event_id}", response_model=EventOut)
def get_event(ev: Event = Depends(staff_event)):
    return ev


@router.put("/events/{event_id}", response_model=EventOut)
def update_event(body: EventIn, ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    sold = db.scalar(select(func.count(Ticket.id)).where(Ticket.event_id == ev.id, Ticket.status != "cancelled"))
    if body.capacity < sold:
        raise HTTPException(422, f"A capacidade não pode ser menor que os {sold} ingressos já vendidos")
    for k, v in body.model_dump().items():
        setattr(ev, k, v)
    db.commit()
    return ev


@router.post("/events/{event_id}/status", response_model=EventOut)
def set_status(body: EventStatusIn, ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    if body.status == "published":
        has_types = db.scalar(select(func.count(TicketType.id)).where(TicketType.event_id == ev.id))
        if not has_types:
            raise HTTPException(422, "Crie ao menos um tipo de ingresso antes de publicar")
        if ev.attendance_mode != "online" and ev.location_visibility == "public":
            if not ev.city or ev.latitude is None or ev.longitude is None:
                raise HTTPException(422, "Informe cidade e coordenadas do local (ou oculte a localização) antes de publicar")
    ev.status = body.status
    db.commit()
    return ev


@router.delete("/events/{event_id}", status_code=204)
def delete_event(ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    if db.scalar(select(func.count(Ticket.id)).where(Ticket.event_id == ev.id)):
        raise HTTPException(409, "Eventos com ingressos emitidos não podem ser excluídos. Despublique-o.")
    db.delete(ev)
    db.commit()


# ---------- ticket types ----------
def _type_out(db: Session, tt: TicketType) -> TicketTypeOut:
    sold = db.scalar(
        select(func.count(Ticket.id)).where(Ticket.ticket_type_id == tt.id, Ticket.status != "cancelled")
    )
    out = TicketTypeOut.model_validate(tt)
    out.sold = sold
    return out


@router.get("/events/{event_id}/ticket-types", response_model=list[TicketTypeOut])
def list_types(ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    return [_type_out(db, t) for t in db.scalars(select(TicketType).where(TicketType.event_id == ev.id).order_by(TicketType.id))]


@router.post("/events/{event_id}/ticket-types", response_model=TicketTypeOut, status_code=201)
def create_type(body: TicketTypeIn, ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    tt = TicketType(event_id=ev.id, **body.model_dump())
    db.add(tt)
    db.commit()
    return _type_out(db, tt)


def _get_type(db: Session, ev: Event, type_id: int) -> TicketType:
    tt = db.get(TicketType, type_id)
    if not tt or tt.event_id != ev.id:
        raise HTTPException(404, "Tipo de ingresso não encontrado")
    return tt


@router.put("/events/{event_id}/ticket-types/{type_id}", response_model=TicketTypeOut)
def update_type(type_id: int, body: TicketTypeIn, ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    tt = _get_type(db, ev, type_id)
    sold = _type_out(db, tt).sold
    if body.quantity < sold:
        raise HTTPException(422, f"A quantidade não pode ser menor que os {sold} ingressos já vendidos")
    if sold and body.price_cents != tt.price_cents:
        raise HTTPException(422, "Não é possível alterar o preço após vendas. Crie um novo lote.")
    for k, v in body.model_dump().items():
        setattr(tt, k, v)
    db.commit()
    return _type_out(db, tt)


@router.delete("/events/{event_id}/ticket-types/{type_id}", status_code=204)
def delete_type(type_id: int, ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    tt = _get_type(db, ev, type_id)
    if _type_out(db, tt).sold or db.scalar(select(func.count(Ticket.id)).where(Ticket.ticket_type_id == tt.id)):
        raise HTTPException(409, "Este lote já possui ingressos. Desative-o em vez de excluir.")
    db.delete(tt)
    db.commit()


# ---------- attendees / check-in ----------
@router.get("/events/{event_id}/attendees", response_model=list[AttendeeOut])
def attendees(ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    rows = db.execute(
        select(Ticket, TicketType.name, User.name)
        .join(TicketType, TicketType.id == Ticket.ticket_type_id)
        .outerjoin(User, User.id == Ticket.user_id)
        .where(Ticket.event_id == ev.id)
        .order_by(Ticket.created_at.desc())
    ).all()
    return [
        AttendeeOut(
            id=t.id, badge_name=t.badge_name, holder_name=holder, ticket_type_name=tname, status=t.status,
            price_cents=t.price_cents, fee_cents=t.fee_cents, payment_method=t.payment_method,
            checked_in_at=t.checked_in_at, created_at=t.created_at,
        )
        for t, tname, holder in rows
    ]


@router.post("/events/{event_id}/tickets/{ticket_id}/cancel", status_code=204)
def cancel_ticket(ticket_id: int, ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    t = db.get(Ticket, ticket_id)
    if not t or t.event_id != ev.id:
        raise HTTPException(404, "Ingresso não encontrado")
    if t.status == "checked_in":
        raise HTTPException(409, "Ingresso já utilizado no check-in")
    t.status = "cancelled"
    t.payment_status = "refunded" if t.price_cents else t.payment_status
    db.commit()


@router.post("/events/{event_id}/checkin", response_model=CheckinOut)
def checkin(body: CheckinIn, ev: Event = Depends(staff_event), db: Session = Depends(get_db)):
    code = body.code.strip().removeprefix("furconhub:ticket:")
    # resposta mínima: apenas o nome do crachá, sem dados pessoais do titular
    t = db.scalar(select(Ticket).where(Ticket.code == code, Ticket.event_id == ev.id).with_for_update())
    if not t:
        return CheckinOut(result="invalid")
    tt = db.get(TicketType, t.ticket_type_id)
    base = dict(badge_name=t.badge_name, ticket_type=tt.name, is_vip=tt.is_vip)
    if t.status == "cancelled":
        return CheckinOut(result="cancelled", **base)
    if t.status == "checked_in":
        return CheckinOut(result="already", checked_in_at=t.checked_in_at, **base)
    t.status, t.checked_in_at = "checked_in", utcnow()
    db.commit()
    return CheckinOut(result="ok", checked_in_at=t.checked_in_at, **base)


# ---------- schedule ----------
def _item_out(db: Session, item: ScheduleItem) -> ScheduleOut:
    n = db.scalar(select(func.count(Signup.id)).where(Signup.item_id == item.id))
    out = ScheduleOut.model_validate(item)
    out.signups = n
    out.spots_left = max(item.capacity - n, 0) if item.capacity else None
    return out


@router.get("/events/{event_id}/schedule", response_model=list[ScheduleOut])
def list_schedule(ev: Event = Depends(staff_event), db: Session = Depends(get_db)):
    items = db.scalars(select(ScheduleItem).where(ScheduleItem.event_id == ev.id).order_by(ScheduleItem.starts_at)).all()
    return [_item_out(db, i) for i in items]


@router.post("/events/{event_id}/schedule", response_model=ScheduleOut, status_code=201)
def create_item(body: ScheduleIn, ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    item = ScheduleItem(event_id=ev.id, **body.model_dump())
    db.add(item)
    db.commit()
    return _item_out(db, item)


def _get_item(db: Session, ev: Event, item_id: int) -> ScheduleItem:
    item = db.get(ScheduleItem, item_id)
    if not item or item.event_id != ev.id:
        raise HTTPException(404, "Atividade não encontrada")
    return item


@router.put("/events/{event_id}/schedule/{item_id}", response_model=ScheduleOut)
def update_item(item_id: int, body: ScheduleIn, ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    item = _get_item(db, ev, item_id)
    n = db.scalar(select(func.count(Signup.id)).where(Signup.item_id == item.id))
    if body.capacity and body.capacity < n:
        raise HTTPException(422, f"Já existem {n} inscritos nesta atividade")
    changed = (item.starts_at, item.ends_at, item.room) != (body.starts_at, body.ends_at, body.room)
    for k, v in body.model_dump().items():
        setattr(item, k, v)
    if changed:
        fans = set(db.scalars(select(Favorite.user_id).where(Favorite.item_id == item.id)))
        fans |= set(db.scalars(select(Signup.user_id).where(Signup.item_id == item.id)))
        notify_users(
            db, fans, ev.id, f"Alteração: {item.title}",
            f"Novo horário: {item.starts_at:%d/%m %H:%M}–{item.ends_at:%H:%M}" + (f" · Sala: {item.room}" if item.room else ""),
        )
    db.commit()
    return _item_out(db, item)


@router.delete("/events/{event_id}/schedule/{item_id}", status_code=204)
def delete_item(item_id: int, ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    item = _get_item(db, ev, item_id)
    fans = set(db.scalars(select(Favorite.user_id).where(Favorite.item_id == item.id)))
    fans |= set(db.scalars(select(Signup.user_id).where(Signup.item_id == item.id)))
    notify_users(db, fans, ev.id, f"Cancelado: {item.title}", "Esta atividade foi removida da programação.")
    db.delete(item)
    db.commit()


# ---------- announcements ----------
@router.get("/events/{event_id}/announcements", response_model=list[AnnouncementOut])
def list_announcements(ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    return db.scalars(select(Announcement).where(Announcement.event_id == ev.id).order_by(Announcement.created_at.desc())).all()


@router.post("/events/{event_id}/announcements", status_code=201)
def create_announcement(body: AnnouncementIn, ev: Event = Depends(admin_event), user: User = Depends(admin_user), db: Session = Depends(get_db)):
    a = Announcement(event_id=ev.id, author_id=user.id, title=body.title, body=body.body)
    db.add(a)
    sent = notify_users(db, event_audience(db, ev.id), ev.id, body.title, body.body)
    db.commit()
    return {"id": a.id, "recipients": sent}


# ---------- places (map) ----------
@router.get("/events/{event_id}/places", response_model=list[PlaceOut])
def list_places(ev: Event = Depends(staff_event), db: Session = Depends(get_db)):
    return db.scalars(select(Place).where(Place.event_id == ev.id).order_by(Place.kind, Place.name)).all()


@router.post("/events/{event_id}/places", response_model=PlaceOut, status_code=201)
def create_place(body: PlaceIn, ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    p = Place(event_id=ev.id, **body.model_dump())
    db.add(p)
    db.commit()
    return p


@router.put("/events/{event_id}/places/{place_id}", response_model=PlaceOut)
def update_place(place_id: int, body: PlaceIn, ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    p = db.get(Place, place_id)
    if not p or p.event_id != ev.id:
        raise HTTPException(404, "Local não encontrado")
    for k, v in body.model_dump().items():
        setattr(p, k, v)
    db.commit()
    return p


@router.delete("/events/{event_id}/places/{place_id}", status_code=204)
def delete_place(place_id: int, ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    p = db.get(Place, place_id)
    if not p or p.event_id != ev.id:
        raise HTTPException(404, "Local não encontrado")
    db.delete(p)
    db.commit()


# ---------- fursuit care requests ----------
@router.get("/events/{event_id}/care-requests", response_model=list[CareRequestOut])
def list_care(ev: Event = Depends(staff_event), db: Session = Depends(get_db)):
    rows = db.execute(
        select(CareRequest, User.name)
        .outerjoin(User, User.id == CareRequest.user_id)
        .where(CareRequest.event_id == ev.id)
        .order_by(CareRequest.status == "resolved", CareRequest.created_at.desc())
    ).all()
    out = []
    for r, name in rows:
        o = CareRequestOut.model_validate(r)
        o.requester = name
        out.append(o)
    return out


@router.post("/events/{event_id}/care-requests/{req_id}/status", response_model=CareRequestOut)
def set_care_status(req_id: int, body: CareStatusIn, ev: Event = Depends(staff_event), db: Session = Depends(get_db)):
    r = db.get(CareRequest, req_id)
    if not r or r.event_id != ev.id:
        raise HTTPException(404, "Solicitação não encontrada")
    r.status = body.status
    r.resolved_at = utcnow() if body.status == "resolved" else None
    if r.user_id:
        labels = {"in_progress": "A equipe está a caminho", "resolved": "Solicitação resolvida"}
        if body.status in labels:
            notify_users(db, [r.user_id], ev.id, f"Fursuit Care: {labels[body.status]}")
    db.commit()
    return CareRequestOut.model_validate(r)


# ---------- achievements ----------
@router.get("/events/{event_id}/achievements", response_model=list[AchievementAdminOut])
def list_achievements(ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    rows = db.execute(
        select(Achievement, func.count(UserAchievement.id))
        .outerjoin(UserAchievement, UserAchievement.achievement_id == Achievement.id)
        .where(Achievement.event_id == ev.id)
        .group_by(Achievement.id)
        .order_by(Achievement.id)
    ).all()
    out = []
    for a, n in rows:
        o = AchievementAdminOut.model_validate(a)
        o.earned_count = n
        out.append(o)
    return out


@router.post("/events/{event_id}/achievements", response_model=AchievementAdminOut, status_code=201)
def create_achievement(body: AchievementIn, ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    a = Achievement(event_id=ev.id, **body.model_dump())
    db.add(a)
    db.commit()
    return AchievementAdminOut.model_validate(a)


@router.delete("/events/{event_id}/achievements/{ach_id}", status_code=204)
def delete_achievement(ach_id: int, ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    a = db.get(Achievement, ach_id)
    if not a or a.event_id != ev.id:
        raise HTTPException(404, "Conquista não encontrada")
    db.delete(a)
    db.commit()


def random_code() -> str:
    return secrets.token_urlsafe(16)
