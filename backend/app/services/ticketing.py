"""Emissão de ingressos: regras de estoque, capacidade e limites (usada por compra logada e de convidado)."""

import secrets

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import Event, Ticket, TicketType
from .payments import gateway, processing_fee_cents

MAX_TICKETS_PER_USER = 5


def sold_count(db: Session, type_id: int) -> int:
    return db.scalar(select(func.count(Ticket.id)).where(Ticket.ticket_type_id == type_id, Ticket.status != "cancelled"))


def issue_ticket(db: Session, ev: Event, ticket_type_id: int, badge_name: str, payment_method: str,
                 user_id: int | None = None, guest_email: str | None = None, guest_token_hash: str | None = None) -> Ticket:
    if ev.status != "published":
        raise HTTPException(409, "Vendas ainda não abertas")
    # trava a linha do lote para evitar vender além do estoque em compras simultâneas
    tt = db.scalar(select(TicketType).where(TicketType.id == ticket_type_id, TicketType.event_id == ev.id).with_for_update())
    if not tt or not tt.active:
        raise HTTPException(404, "Tipo de ingresso indisponível")
    if sold_count(db, tt.id) >= tt.quantity:
        raise HTTPException(409, "Ingressos esgotados para este lote")
    total = db.scalar(select(func.count(Ticket.id)).where(Ticket.event_id == ev.id, Ticket.status != "cancelled"))
    if total >= ev.capacity:
        raise HTTPException(409, "Capacidade do evento esgotada")
    owner = Ticket.user_id == user_id if user_id else Ticket.guest_email == guest_email
    mine = db.scalar(select(func.count(Ticket.id)).where(Ticket.event_id == ev.id, owner, Ticket.status != "cancelled"))
    if mine >= MAX_TICKETS_PER_USER:
        raise HTTPException(409, f"Limite de {MAX_TICKETS_PER_USER} ingressos por pessoa")
    price = tt.price_cents  # sempre do servidor
    status = gateway.charge(price, payment_method) if price else "paid"
    t = Ticket(
        event_id=ev.id, ticket_type_id=tt.id, user_id=user_id, code=secrets.token_urlsafe(16),
        badge_name=badge_name.strip(), price_cents=price, fee_cents=processing_fee_cents(price),
        payment_method=payment_method if price else "free", payment_status=status,
        guest_email=guest_email, guest_token_hash=guest_token_hash,
    )
    db.add(t)
    db.flush()
    return t
