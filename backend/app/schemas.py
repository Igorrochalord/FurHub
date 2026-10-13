from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- auth ----------
class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Literal["participant", "artist"] = "participant"
    accept_privacy: bool

    @field_validator("accept_privacy")
    @classmethod
    def _must_accept(cls, v):
        if not v:
            raise ValueError("É necessário aceitar a política de privacidade")
        return v


class OrganizerRegisterIn(RegisterIn):
    organization_name: str = Field(min_length=2, max_length=160)
    role: Literal["participant", "artist"] = "participant"  # ignorado


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(ORM):
    id: int
    email: str
    name: str
    role: str
    organization_id: int | None
    is_demo: bool = False


class OrganizationOut(ORM):
    id: int
    name: str
    plan: str


class TokenOut(BaseModel):
    access_token: str
    user: UserOut


class PasswordChangeIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class TeamMemberIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Literal["volunteer", "admin"] = "volunteer"


# ---------- events ----------
class EventIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    description: str = ""
    venue: str = ""
    city: str = ""
    start_date: date
    end_date: date
    capacity: int = Field(ge=1, le=200000)
    budget_cents: int = Field(0, ge=0)
    care_guidelines: str = ""
    retention_days: int = Field(180, ge=30, le=3650)
    category: Literal["convention", "meetup", "artist_fair", "games", "workshop", "festival", "charity", "virtual", "other"] = "convention"
    attendance_mode: Literal["presential", "online", "hybrid"] = "presential"
    country: str = Field("BR", min_length=2, max_length=2)
    state: str = Field("", max_length=60)
    district: str = Field("", max_length=100)
    address: str = Field("", max_length=255)
    postal_code: str = Field("", max_length=20)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    location_visibility: Literal["public", "city_only", "hidden"] = "public"
    timezone: str = Field("America/Sao_Paulo", max_length=40)
    age_rating: Literal["L", "14", "16", "18"] = "L"
    banner_url: str = Field("", max_length=500)
    online_url: str = Field("", max_length=500)

    @model_validator(mode="after")
    def _coords(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Informe latitude e longitude juntas")
        return self

    @model_validator(mode="after")
    def _dates(self):
        if self.end_date < self.start_date:
            raise ValueError("A data final deve ser igual ou posterior à inicial")
        return self


class EventOut(ORM):
    id: int
    organization_id: int
    name: str
    description: str
    venue: str
    city: str
    start_date: date
    end_date: date
    capacity: int
    status: str
    budget_cents: int
    care_guidelines: str
    retention_days: int
    is_demo: bool
    slug: str | None = None
    category: str = "convention"
    attendance_mode: str = "presential"
    country: str = "BR"
    state: str = ""
    district: str = ""
    address: str = ""
    postal_code: str = ""
    latitude: float | None = None
    longitude: float | None = None
    location_visibility: str = "public"
    timezone: str = "America/Sao_Paulo"
    age_rating: str = "L"
    banner_url: str = ""
    online_url: str = ""


class EventStatusIn(BaseModel):
    status: Literal["draft", "published", "cancelled"]


class TicketTypeIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str = ""
    price_cents: int = Field(ge=0, le=10_000_000)
    quantity: int = Field(ge=1, le=200000)
    is_vip: bool = False
    active: bool = True


class TicketTypeOut(ORM):
    id: int
    event_id: int
    name: str
    description: str
    price_cents: int
    quantity: int
    is_vip: bool
    active: bool
    sold: int = 0


class PurchaseIn(BaseModel):
    ticket_type_id: int
    badge_name: str = Field(min_length=1, max_length=80)
    payment_method: Literal["pix", "card"] = "pix"


class TicketOut(ORM):
    id: int
    event_id: int
    ticket_type_id: int
    ticket_type_name: str = ""
    event_name: str = ""
    is_vip: bool = False
    code: str
    badge_name: str
    status: str
    price_cents: int
    payment_method: str
    checked_in_at: datetime | None
    created_at: datetime


class AttendeeOut(BaseModel):
    id: int
    badge_name: str
    holder_name: str | None
    ticket_type_name: str
    status: str
    price_cents: int
    fee_cents: int
    payment_method: str
    checked_in_at: datetime | None
    created_at: datetime


class CheckinIn(BaseModel):
    code: str = Field(min_length=6, max_length=200)


class CheckinOut(BaseModel):
    result: Literal["ok", "already", "invalid", "cancelled"]
    badge_name: str | None = None
    ticket_type: str | None = None
    is_vip: bool = False
    checked_in_at: datetime | None = None


# ---------- schedule ----------
class ScheduleIn(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    description: str = ""
    kind: Literal["panel", "workshop", "contest", "game", "parade", "party", "other"] = "panel"
    room: str = ""
    speaker: str = ""
    starts_at: datetime
    ends_at: datetime
    capacity: int | None = Field(None, ge=1, le=100000)

    @model_validator(mode="after")
    def _times(self):
        if self.ends_at <= self.starts_at:
            raise ValueError("O término deve ser posterior ao início")
        return self


class ScheduleOut(ORM):
    id: int
    event_id: int
    title: str
    description: str
    kind: str
    room: str
    speaker: str
    starts_at: datetime
    ends_at: datetime
    capacity: int | None
    signups: int = 0
    spots_left: int | None = None
    favorited: bool = False
    signed_up: bool = False


# ---------- artists ----------
class ApplicationIn(BaseModel):
    kind: Literal["artist", "dealer"] = "artist"
    display_name: str = Field(min_length=2, max_length=120)
    description: str = Field("", max_length=2000)
    portfolio_url: str = Field("", max_length=300)

    @field_validator("portfolio_url")
    @classmethod
    def _url(cls, v):
        v = v.strip()
        if v and not v.lower().startswith(("http://", "https://")):
            raise ValueError("O portfólio deve começar com http:// ou https://")
        return v


class ApplicationReviewIn(BaseModel):
    status: Literal["pending", "approved", "rejected"]
    table_label: str = Field("", max_length=20)
    fee_cents: int = Field(0, ge=0, le=10_000_000)
    review_note: str = Field("", max_length=300)


class ApplicationOut(ORM):
    id: int
    event_id: int
    event_name: str = ""
    kind: str
    display_name: str
    description: str
    portfolio_url: str
    status: str
    table_label: str
    fee_cents: int
    review_note: str
    applicant_name: str | None = None
    created_at: datetime


class ArtistPublicOut(BaseModel):
    id: int
    kind: str
    display_name: str
    description: str
    portfolio_url: str
    table_label: str


# ---------- volunteers ----------
class ShiftIn(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    area: str = ""
    starts_at: datetime
    ends_at: datetime
    slots: int = Field(1, ge=1, le=500)

    @model_validator(mode="after")
    def _times(self):
        if self.ends_at <= self.starts_at:
            raise ValueError("O término deve ser posterior ao início")
        return self


class ShiftMember(BaseModel):
    user_id: int
    name: str
    confirmed: bool


class ShiftOut(BaseModel):
    id: int
    event_id: int
    event_name: str = ""
    title: str
    area: str
    starts_at: datetime
    ends_at: datetime
    slots: int
    members: list[ShiftMember] = []
    confirmed: bool | None = None  # visão do voluntário


class AssignIn(BaseModel):
    user_id: int


# ---------- finance ----------
class ExpenseIn(BaseModel):
    category: str = Field(min_length=2, max_length=60)
    description: str = Field("", max_length=200)
    amount_cents: int = Field(gt=0, le=10_000_000_000)


class ExpenseOut(ORM):
    id: int
    category: str
    description: str
    amount_cents: int
    created_at: datetime


# ---------- comms / places / care ----------
class AnnouncementIn(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    body: str = Field(min_length=2, max_length=4000)


class AnnouncementOut(ORM):
    id: int
    title: str
    body: str
    created_at: datetime


class NotificationOut(ORM):
    id: int
    event_id: int | None
    title: str
    body: str
    read: bool
    created_at: datetime


PLACE_KINDS = ("room", "entrance", "artist_alley", "dealers", "lounge", "hydration", "rest", "medical", "food", "other")


class PlaceIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    kind: Literal[PLACE_KINDS] = "room"  # type: ignore[valid-type]
    description: str = Field("", max_length=400)
    hours: str = Field("", max_length=80)
    x: float = Field(50, ge=0, le=100)
    y: float = Field(50, ge=0, le=100)


class PlaceOut(ORM):
    id: int
    name: str
    kind: str
    description: str
    hours: str
    x: float
    y: float


class CareRequestIn(BaseModel):
    kind: Literal["water", "rest", "handler", "medical", "help"] = "help"
    message: str = Field("", max_length=400)
    location: str = Field("", max_length=120)


class CareRequestOut(ORM):
    id: int
    event_id: int
    kind: str
    message: str
    location: str
    status: str
    created_at: datetime
    resolved_at: datetime | None
    requester: str | None = None


class CareStatusIn(BaseModel):
    status: Literal["open", "in_progress", "resolved"]


# ---------- fursona / passport ----------
class FursonaIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    species: str = Field("", max_length=80)
    bio: str = Field("", max_length=1000)
    color: str = Field("#22d3ee", pattern=r"^#[0-9a-fA-F]{6}$")
    is_public: bool = False


class FursonaOut(ORM):
    id: int
    name: str
    species: str
    bio: str
    color: str
    is_public: bool


class AchievementIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str = Field("", max_length=300)
    category: Literal["activity", "artist", "workshop", "charity", "general"] = "activity"
    points: int = Field(10, ge=1, le=1000)
    claim_code: str = Field(min_length=3, max_length=40)


class AchievementAdminOut(ORM):
    id: int
    name: str
    description: str
    category: str
    points: int
    claim_code: str
    earned_count: int = 0


class PassportItemOut(BaseModel):
    id: int
    name: str
    description: str
    category: str
    points: int
    earned: bool
    earned_at: datetime | None = None


class ClaimIn(BaseModel):
    code: str = Field(min_length=3, max_length=40)
