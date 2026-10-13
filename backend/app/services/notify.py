from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Application, Notification, Shift, ShiftAssignment, Ticket


def notify_users(db: Session, user_ids, event_id: int, title: str, body: str = "") -> int:
    ids = {u for u in user_ids if u}
    db.add_all(Notification(user_id=u, event_id=event_id, title=title, body=body) for u in ids)
    return len(ids)


def event_audience(db: Session, event_id: int) -> set[int]:
    """Portadores de ingresso, artistas aprovados e voluntários escalados."""
    ids = set(
        db.scalars(select(Ticket.user_id).where(Ticket.event_id == event_id, Ticket.status != "cancelled"))
    )
    ids |= set(
        db.scalars(select(Application.user_id).where(Application.event_id == event_id, Application.status == "approved"))
    )
    ids |= set(
        db.scalars(
            select(ShiftAssignment.user_id).join(Shift, Shift.id == ShiftAssignment.shift_id).where(Shift.event_id == event_id)
        )
    )
    ids.discard(None)
    return ids
