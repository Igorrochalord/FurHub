from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Event
from .geo import unique_slug


def assign_slug(db: Session, ev: Event) -> None:
    if not ev.slug:
        ev.slug = unique_slug(db, Event, ev.name, ev.start_date.year)


def backfill_slugs(db: Session) -> None:
    for ev in db.scalars(select(Event).where(Event.slug.is_(None))).all():
        assign_slug(db, ev)
    db.commit()
