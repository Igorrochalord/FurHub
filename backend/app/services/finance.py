"""Todos os cálculos financeiros e de indicadores ficam no backend."""

from collections import defaultdict

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import (
    Application,
    CareRequest,
    Event,
    Expense,
    ScheduleItem,
    Shift,
    ShiftAssignment,
    Signup,
    Ticket,
    TicketType,
)


def finance(db: Session, ev: Event) -> dict:
    tickets = db.execute(
        select(Ticket, TicketType.name)
        .join(TicketType, TicketType.id == Ticket.ticket_type_id)
        .where(Ticket.event_id == ev.id, Ticket.status != "cancelled")
    ).all()
    gross = sum(t.price_cents for t, _ in tickets)
    fees = sum(t.fee_cents for t, _ in tickets)
    ticket_net = gross - fees

    table_fees = db.scalar(
        select(func.coalesce(func.sum(Application.fee_cents), 0)).where(
            Application.event_id == ev.id, Application.status == "approved"
        )
    )
    expenses_rows = db.execute(select(Expense).where(Expense.event_id == ev.id)).scalars().all()
    expenses = sum(e.amount_cents for e in expenses_rows)

    by_type: dict[str, dict] = defaultdict(lambda: {"sold": 0, "revenue_cents": 0})
    by_day: dict[str, dict] = defaultdict(lambda: {"tickets": 0, "revenue_cents": 0})
    for t, type_name in tickets:
        by_type[type_name]["sold"] += 1
        by_type[type_name]["revenue_cents"] += t.price_cents
        d = t.created_at.date().isoformat()
        by_day[d]["tickets"] += 1
        by_day[d]["revenue_cents"] += t.price_cents
    by_cat: dict[str, int] = defaultdict(int)
    for e in expenses_rows:
        by_cat[e.category] += e.amount_cents

    revenue_total = gross + table_fees
    net = ticket_net + table_fees - expenses
    return {
        "ticket_gross_cents": gross,
        "payment_fees_cents": fees,
        "ticket_net_cents": ticket_net,
        "table_fees_cents": table_fees,
        "revenue_total_cents": revenue_total,
        "expenses_cents": expenses,
        "net_cents": net,
        "budget_cents": ev.budget_cents,
        "budget_used_pct": round(expenses * 100 / ev.budget_cents, 1) if ev.budget_cents else None,
        "margin_pct": round(net * 100 / revenue_total, 1) if revenue_total else None,
        "revenue_by_type": [{"name": k, **v} for k, v in by_type.items()],
        "expenses_by_category": [{"category": k, "amount_cents": v} for k, v in sorted(by_cat.items())],
        "sales_by_day": [{"date": k, **v} for k, v in sorted(by_day.items())],
        "revenue_by_category": [
            {"category": "Ingressos", "amount_cents": gross},
            {"category": "Mesas (Artist Alley / Dealers)", "amount_cents": table_fees},
        ],
    }


def dashboard(db: Session, ev: Event) -> dict:
    fin = finance(db, ev)
    sold = db.scalar(select(func.count(Ticket.id)).where(Ticket.event_id == ev.id, Ticket.status != "cancelled"))
    checked = db.scalar(select(func.count(Ticket.id)).where(Ticket.event_id == ev.id, Ticket.status == "checked_in"))
    apps = dict(
        db.execute(
            select(Application.status, func.count()).where(Application.event_id == ev.id).group_by(Application.status)
        ).all()
    )
    open_care = db.scalar(
        select(func.count(CareRequest.id)).where(CareRequest.event_id == ev.id, CareRequest.status != "resolved")
    )
    slots = db.scalar(select(func.coalesce(func.sum(Shift.slots), 0)).where(Shift.event_id == ev.id))
    assigned = db.scalar(
        select(func.count(ShiftAssignment.id)).join(Shift, Shift.id == ShiftAssignment.shift_id).where(Shift.event_id == ev.id)
    )
    sessions = db.scalar(select(func.count(ScheduleItem.id)).where(ScheduleItem.event_id == ev.id))
    return {
        "event": {"id": ev.id, "name": ev.name, "status": ev.status, "capacity": ev.capacity, "is_demo": ev.is_demo},
        "tickets_sold": sold,
        "capacity_used_pct": round(sold * 100 / ev.capacity, 1) if ev.capacity else 0,
        "checked_in": checked,
        "checkin_rate_pct": round(checked * 100 / sold, 1) if sold else 0,
        "applications": {"pending": apps.get("pending", 0), "approved": apps.get("approved", 0), "rejected": apps.get("rejected", 0)},
        "open_care_requests": open_care,
        "shift_slots": slots,
        "shift_assigned": assigned,
        "shift_coverage_pct": round(assigned * 100 / slots, 1) if slots else 0,
        "sessions": sessions,
        "finance": fin,
    }


def report(db: Session, ev: Event) -> dict:
    """Relatório pós-evento: finanças + comparecimento + ocupação das atividades."""
    d = dashboard(db, ev)
    rows = db.execute(
        select(ScheduleItem, func.count(Signup.id))
        .outerjoin(Signup, Signup.item_id == ScheduleItem.id)
        .where(ScheduleItem.event_id == ev.id)
        .group_by(ScheduleItem.id)
        .order_by(ScheduleItem.starts_at)
    ).all()
    d["session_occupancy"] = [
        {
            "id": s.id,
            "title": s.title,
            "kind": s.kind,
            "signups": n,
            "capacity": s.capacity,
            "occupancy_pct": round(n * 100 / s.capacity, 1) if s.capacity else None,
        }
        for s, n in rows
    ]
    d["tickets_by_status"] = dict(
        db.execute(select(Ticket.status, func.count()).where(Ticket.event_id == ev.id).group_by(Ticket.status)).all()
    )
    return d
