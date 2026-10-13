"""Política de retenção: anonimiza dados pessoais de eventos encerrados há mais de `retention_days`.

Uso: python -m app.retention
"""

import secrets
from datetime import timedelta

from sqlalchemy import select

from .db import SessionLocal
from .models import CareRequest, Event, Notification, Ticket, utcnow


def purge_expired(db) -> int:
    today = utcnow().date()
    n = 0
    for ev in db.scalars(select(Event)):
        if today <= ev.end_date + timedelta(days=ev.retention_days):
            continue
        for t in db.scalars(select(Ticket).where(Ticket.event_id == ev.id, Ticket.user_id.is_not(None))):
            t.user_id, t.badge_name, t.code = None, "Anônimo", secrets.token_urlsafe(16)
            n += 1
        for t in db.scalars(select(Ticket).where(Ticket.event_id == ev.id, Ticket.guest_email.is_not(None))):
            t.guest_email, t.guest_token_hash, t.badge_name, t.code = None, None, "Anônimo", secrets.token_urlsafe(16)
            n += 1
        for r in db.scalars(select(CareRequest).where(CareRequest.event_id == ev.id, CareRequest.user_id.is_not(None))):
            r.user_id, r.message, r.location = None, "", ""
        for nt in db.scalars(select(Notification).where(Notification.event_id == ev.id)):
            db.delete(nt)
    db.commit()
    return n


if __name__ == "__main__":
    with SessionLocal() as session:
        print(f"{purge_expired(session)} ingressos anonimizados")
