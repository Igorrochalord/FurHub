from datetime import UTC, date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow() -> datetime:
    """Naive UTC for audit timestamps. Event times are stored as naive local event time."""
    return datetime.now(UTC).replace(tzinfo=None)


class Base(DeclarativeBase):
    pass


def fk(table: str, nullable: bool = False, on_delete: str = "CASCADE"):
    return mapped_column(ForeignKey(f"{table}.id", ondelete=on_delete), nullable=nullable, index=True)


class Organization(Base):
    __tablename__ = "organizations"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    plan: Mapped[str] = mapped_column(String(20), default="indie")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(160))
    # admin | volunteer (ligados a uma organização) | artist | participant
    role: Mapped[str] = mapped_column(String(20), default="participant")
    organization_id: Mapped[int | None] = fk("organizations", nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    privacy_accepted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Fursona(Base):
    __tablename__ = "fursonas"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    name: Mapped[str] = mapped_column(String(80))
    species: Mapped[str] = mapped_column(String(80), default="")
    bio: Mapped[str] = mapped_column(Text, default="")
    color: Mapped[str] = mapped_column(String(12), default="#22d3ee")
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)  # privacidade por padrão


class Event(Base):
    __tablename__ = "events"
    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = fk("organizations")
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    venue: Mapped[str] = mapped_column(String(160), default="")
    city: Mapped[str] = mapped_column(String(100), default="")
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    capacity: Mapped[int] = mapped_column(Integer, default=100)
    status: Mapped[str] = mapped_column(String(12), default="draft")  # draft | published
    budget_cents: Mapped[int] = mapped_column(BigInteger, default=0)
    care_guidelines: Mapped[str] = mapped_column(Text, default="")
    retention_days: Mapped[int] = mapped_column(Integer, default=180)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    # --- descoberta pública / geolocalização ---
    slug: Mapped[str | None] = mapped_column(String(180), unique=True, index=True, nullable=True)
    # convention | meetup | artist_fair | games | workshop | festival | charity | virtual | other
    category: Mapped[str] = mapped_column(String(20), default="convention", index=True)
    attendance_mode: Mapped[str] = mapped_column(String(12), default="presential")  # presential | online | hybrid
    country: Mapped[str] = mapped_column(String(2), default="BR")
    state: Mapped[str] = mapped_column(String(60), default="")
    district: Mapped[str] = mapped_column(String(100), default="")
    address: Mapped[str] = mapped_column(String(255), default="")
    postal_code: Mapped[str] = mapped_column(String(20), default="")
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True, index=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True, index=True)
    # public: endereço e marcador | city_only: só cidade, sem marcador | hidden: nada além de "a divulgar"
    location_visibility: Mapped[str] = mapped_column(String(12), default="public")
    timezone: Mapped[str] = mapped_column(String(40), default="America/Sao_Paulo")
    age_rating: Mapped[str] = mapped_column(String(4), default="L")  # L | 14 | 16 | 18
    banner_url: Mapped[str] = mapped_column(String(500), default="")
    online_url: Mapped[str] = mapped_column(String(500), default="")


class TicketType(Base):
    __tablename__ = "ticket_types"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = fk("events")
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(String(300), default="")
    price_cents: Mapped[int] = mapped_column(Integer, default=0)
    quantity: Mapped[int] = mapped_column(Integer, default=100)
    is_vip: Mapped[bool] = mapped_column(Boolean, default=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Ticket(Base):
    __tablename__ = "tickets"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = fk("events")
    ticket_type_id: Mapped[int] = fk("ticket_types")
    user_id: Mapped[int | None] = fk("users", nullable=True, on_delete="SET NULL")
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)  # token opaco do QR
    badge_name: Mapped[str] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(12), default="valid")  # valid | checked_in | cancelled
    price_cents: Mapped[int] = mapped_column(Integer, default=0)
    fee_cents: Mapped[int] = mapped_column(Integer, default=0)
    payment_method: Mapped[str] = mapped_column(String(12), default="free")
    payment_status: Mapped[str] = mapped_column(String(12), default="paid")
    checked_in_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    # checkout como convidado: acesso posterior por link secreto (guardamos só o hash)
    guest_email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    guest_token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True, index=True)


class GeocodeCache(Base):
    """Evita geocodificar o mesmo endereço repetidamente."""

    __tablename__ = "geocode_cache"
    id: Mapped[int] = mapped_column(primary_key=True)
    query: Mapped[str] = mapped_column(String(300), unique=True, index=True)
    results_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ContactMessage(Base):
    __tablename__ = "contact_messages"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255))
    subject: Mapped[str] = mapped_column(String(160), default="")
    message: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ScheduleItem(Base):
    __tablename__ = "schedule_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = fk("events")
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    kind: Mapped[str] = mapped_column(String(20), default="panel")  # panel|workshop|contest|game|parade|party|other
    room: Mapped[str] = mapped_column(String(100), default="")
    speaker: Mapped[str] = mapped_column(String(160), default="")
    starts_at: Mapped[datetime] = mapped_column(DateTime)
    ends_at: Mapped[datetime] = mapped_column(DateTime)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "item_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = fk("users")
    item_id: Mapped[int] = fk("schedule_items")


class Signup(Base):
    __tablename__ = "signups"
    __table_args__ = (UniqueConstraint("user_id", "item_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = fk("users")
    item_id: Mapped[int] = fk("schedule_items")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (UniqueConstraint("event_id", "user_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = fk("events")
    user_id: Mapped[int] = fk("users")
    kind: Mapped[str] = mapped_column(String(10), default="artist")  # artist | dealer
    display_name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    portfolio_url: Mapped[str] = mapped_column(String(300), default="")
    status: Mapped[str] = mapped_column(String(10), default="pending")  # pending|approved|rejected
    table_label: Mapped[str] = mapped_column(String(20), default="")
    fee_cents: Mapped[int] = mapped_column(Integer, default=0)
    review_note: Mapped[str] = mapped_column(String(300), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Shift(Base):
    __tablename__ = "shifts"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = fk("events")
    title: Mapped[str] = mapped_column(String(120))
    area: Mapped[str] = mapped_column(String(80), default="")
    starts_at: Mapped[datetime] = mapped_column(DateTime)
    ends_at: Mapped[datetime] = mapped_column(DateTime)
    slots: Mapped[int] = mapped_column(Integer, default=1)


class ShiftAssignment(Base):
    __tablename__ = "shift_assignments"
    __table_args__ = (UniqueConstraint("shift_id", "user_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    shift_id: Mapped[int] = fk("shifts")
    user_id: Mapped[int] = fk("users")
    confirmed: Mapped[bool] = mapped_column(Boolean, default=False)


class Expense(Base):
    __tablename__ = "expenses"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = fk("events")
    category: Mapped[str] = mapped_column(String(60))
    description: Mapped[str] = mapped_column(String(200), default="")
    amount_cents: Mapped[int] = mapped_column(BigInteger)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Announcement(Base):
    __tablename__ = "announcements"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = fk("events")
    author_id: Mapped[int | None] = fk("users", nullable=True, on_delete="SET NULL")
    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = fk("users")
    event_id: Mapped[int | None] = fk("events", nullable=True)
    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[str] = mapped_column(Text, default="")
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Place(Base):
    """Ponto do mapa. Os tipos lounge/hydration/rest/medical formam o módulo Fursuit Care."""

    __tablename__ = "places"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = fk("events")
    name: Mapped[str] = mapped_column(String(120))
    kind: Mapped[str] = mapped_column(String(20), default="room")
    description: Mapped[str] = mapped_column(String(400), default="")
    hours: Mapped[str] = mapped_column(String(80), default="")
    x: Mapped[float] = mapped_column(Float, default=50)  # % da largura do mapa
    y: Mapped[float] = mapped_column(Float, default=50)  # % da altura do mapa


class CareRequest(Base):
    __tablename__ = "care_requests"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = fk("events")
    user_id: Mapped[int | None] = fk("users", nullable=True, on_delete="SET NULL")
    kind: Mapped[str] = mapped_column(String(20), default="help")  # water|rest|handler|medical|help
    message: Mapped[str] = mapped_column(String(400), default="")
    location: Mapped[str] = mapped_column(String(120), default="")
    status: Mapped[str] = mapped_column(String(12), default="open")  # open|in_progress|resolved
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class Achievement(Base):
    __tablename__ = "achievements"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = fk("events")
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(String(300), default="")
    category: Mapped[str] = mapped_column(String(20), default="activity")
    points: Mapped[int] = mapped_column(Integer, default=10)
    # código divulgado no local da atividade; o passaporte não usa rastreamento de localização
    claim_code: Mapped[str] = mapped_column(String(40))


class UserAchievement(Base):
    __tablename__ = "user_achievements"
    __table_args__ = (UniqueConstraint("user_id", "achievement_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = fk("users")
    achievement_id: Mapped[int] = fk("achievements")
    earned_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
