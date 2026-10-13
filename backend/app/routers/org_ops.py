"""Painel dos organizadores: artistas/vendedores, voluntários, financeiro, equipe e relatórios."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import admin_event, admin_user
from ..models import Application, Event, Expense, Shift, ShiftAssignment, User
from ..schemas import (
    ApplicationOut,
    ApplicationReviewIn,
    AssignIn,
    ExpenseIn,
    ExpenseOut,
    ShiftIn,
    ShiftMember,
    ShiftOut,
    TeamMemberIn,
    UserOut,
)
from ..security import hash_password
from ..services import finance as fin
from ..services.notify import notify_users

router = APIRouter(prefix="/api/org", tags=["organizer"])


# ---------- artists & dealers ----------
@router.get("/events/{event_id}/applications", response_model=list[ApplicationOut])
def list_applications(ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    rows = db.execute(
        select(Application, User.name).join(User, User.id == Application.user_id)
        .where(Application.event_id == ev.id).order_by(Application.created_at.desc())
    ).all()
    out = []
    for a, name in rows:
        o = ApplicationOut.model_validate(a)
        o.applicant_name = name
        out.append(o)
    return out


@router.put("/events/{event_id}/applications/{app_id}", response_model=ApplicationOut)
def review_application(app_id: int, body: ApplicationReviewIn, ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    a = db.get(Application, app_id)
    if not a or a.event_id != ev.id:
        raise HTTPException(404, "Inscrição não encontrada")
    if body.status == "approved" and body.table_label:
        taken = db.scalar(
            select(Application.id).where(
                Application.event_id == ev.id, Application.status == "approved",
                Application.table_label == body.table_label, Application.id != a.id,
            )
        )
        if taken:
            raise HTTPException(409, f"A mesa {body.table_label} já está atribuída a outro participante")
    previous = a.status
    a.status = body.status
    a.table_label = body.table_label if body.status == "approved" else ""
    a.fee_cents = body.fee_cents if body.status == "approved" else 0
    a.review_note = body.review_note
    if previous != body.status and body.status in ("approved", "rejected"):
        msg = "aprovada" if body.status == "approved" else "não aprovada"
        extra = f" Mesa {a.table_label}." if a.table_label else ""
        notify_users(db, [a.user_id], ev.id, f"Sua inscrição em {ev.name} foi {msg}", (body.review_note + extra).strip())
    db.commit()
    return ApplicationOut.model_validate(a)


# ---------- volunteers ----------
def _shift_out(db: Session, s: Shift) -> ShiftOut:
    rows = db.execute(
        select(ShiftAssignment, User.name).join(User, User.id == ShiftAssignment.user_id).where(ShiftAssignment.shift_id == s.id)
    ).all()
    return ShiftOut(
        id=s.id, event_id=s.event_id, title=s.title, area=s.area, starts_at=s.starts_at, ends_at=s.ends_at, slots=s.slots,
        members=[ShiftMember(user_id=a.user_id, name=n, confirmed=a.confirmed) for a, n in rows],
    )


@router.get("/events/{event_id}/shifts", response_model=list[ShiftOut])
def list_shifts(ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    return [_shift_out(db, s) for s in db.scalars(select(Shift).where(Shift.event_id == ev.id).order_by(Shift.starts_at))]


@router.post("/events/{event_id}/shifts", response_model=ShiftOut, status_code=201)
def create_shift(body: ShiftIn, ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    s = Shift(event_id=ev.id, **body.model_dump())
    db.add(s)
    db.commit()
    return _shift_out(db, s)


def _get_shift(db: Session, ev: Event, shift_id: int) -> Shift:
    s = db.get(Shift, shift_id)
    if not s or s.event_id != ev.id:
        raise HTTPException(404, "Turno não encontrado")
    return s


@router.delete("/events/{event_id}/shifts/{shift_id}", status_code=204)
def delete_shift(shift_id: int, ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    db.delete(_get_shift(db, ev, shift_id))
    db.commit()


@router.post("/events/{event_id}/shifts/{shift_id}/assign", response_model=ShiftOut)
def assign(shift_id: int, body: AssignIn, ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    s = _get_shift(db, ev, shift_id)
    member = db.get(User, body.user_id)
    if not member or member.organization_id != ev.organization_id or member.role not in ("volunteer", "admin"):
        raise HTTPException(404, "Membro da equipe não encontrado")
    current = _shift_out(db, s)
    if any(m.user_id == member.id for m in current.members):
        raise HTTPException(409, "Este membro já está neste turno")
    if len(current.members) >= s.slots:
        raise HTTPException(409, "Todas as vagas deste turno já foram preenchidas")
    # evita sobreposição de turnos para a mesma pessoa
    clash = db.scalar(
        select(Shift.id).join(ShiftAssignment, ShiftAssignment.shift_id == Shift.id).where(
            ShiftAssignment.user_id == member.id, Shift.event_id == ev.id, Shift.id != s.id,
            Shift.starts_at < s.ends_at, Shift.ends_at > s.starts_at,
        )
    )
    if clash:
        raise HTTPException(409, "Este membro já tem um turno que se sobrepõe a este horário")
    db.add(ShiftAssignment(shift_id=s.id, user_id=member.id))
    notify_users(db, [member.id], ev.id, f"Novo turno: {s.title}", f"{s.starts_at:%d/%m %H:%M}–{s.ends_at:%H:%M} · {s.area}")
    db.commit()
    return _shift_out(db, s)


@router.delete("/events/{event_id}/shifts/{shift_id}/assign/{user_id}", response_model=ShiftOut)
def unassign(shift_id: int, user_id: int, ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    s = _get_shift(db, ev, shift_id)
    a = db.scalar(select(ShiftAssignment).where(ShiftAssignment.shift_id == s.id, ShiftAssignment.user_id == user_id))
    if a:
        db.delete(a)
        db.commit()
    return _shift_out(db, s)


# ---------- expenses ----------
@router.get("/events/{event_id}/expenses", response_model=list[ExpenseOut])
def list_expenses(ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    return db.scalars(select(Expense).where(Expense.event_id == ev.id).order_by(Expense.created_at.desc())).all()


@router.post("/events/{event_id}/expenses", response_model=ExpenseOut, status_code=201)
def create_expense(body: ExpenseIn, ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    e = Expense(event_id=ev.id, **body.model_dump())
    db.add(e)
    db.commit()
    return e


@router.delete("/events/{event_id}/expenses/{exp_id}", status_code=204)
def delete_expense(exp_id: int, ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    e = db.get(Expense, exp_id)
    if not e or e.event_id != ev.id:
        raise HTTPException(404, "Despesa não encontrada")
    db.delete(e)
    db.commit()


# ---------- dashboard / reports ----------
@router.get("/events/{event_id}/dashboard")
def dashboard(ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    return fin.dashboard(db, ev)


@router.get("/events/{event_id}/report")
def report(ev: Event = Depends(admin_event), db: Session = Depends(get_db)):
    return fin.report(db, ev)


# ---------- team ----------
@router.get("/team", response_model=list[UserOut])
def team(user: User = Depends(admin_user), db: Session = Depends(get_db)):
    return db.scalars(select(User).where(User.organization_id == user.organization_id, User.is_active).order_by(User.name)).all()


@router.post("/team", response_model=UserOut, status_code=201)
def add_member(body: TeamMemberIn, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    if db.scalar(select(User.id).where(User.email == body.email.lower())):
        raise HTTPException(409, "E-mail já cadastrado")
    m = User(
        email=body.email.lower(), name=body.name.strip(), role=body.role, organization_id=user.organization_id,
        password_hash=hash_password(body.password),
    )
    db.add(m)
    db.commit()
    return m


@router.delete("/team/{member_id}", status_code=204)
def remove_member(member_id: int, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    m = db.get(User, member_id)
    if not m or m.organization_id != user.organization_id:
        raise HTTPException(404, "Membro não encontrado")
    if m.id == user.id:
        raise HTTPException(409, "Você não pode remover a si mesmo")
    m.is_active = False
    db.commit()
