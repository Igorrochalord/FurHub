"""API pública versionada (/api/v1/public): descoberta de eventos, mapa e calendário. Sem autenticação."""

import hashlib
import html
import json
import math
import re
import secrets
import time
import urllib.request
from datetime import date, timedelta
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import and_, exists, func, or_, select, text
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..deps import optional_user
from ..models import (
    Application,
    ContactMessage,
    Event,
    Organization,
    Place,
    ScheduleItem,
    Ticket,
    TicketType,
    User,
    utcnow,
)
from ..schemas import ArtistPublicOut, PlaceOut, ScheduleOut
from ..services.geo import bounding_box, haversine_km
from ..services.ticketing import issue_ticket

router = APIRouter(prefix="/api/v1/public", tags=["public"])

CATEGORIES = {
    "convention": "Convenção furry",
    "meetup": "Meetup",
    "artist_fair": "Feira de artistas",
    "games": "Evento de jogos",
    "workshop": "Workshop",
    "festival": "Festival",
    "charity": "Evento beneficente",
    "virtual": "Evento virtual",
    "other": "Outros encontros",
}
VISIBLE = ("published", "cancelled")  # rascunhos nunca aparecem
MAX_LIMIT = 100


# ---------- serialização ----------
def _ticket_stats(db: Session, ids: list[int]) -> dict[int, dict]:
    """Preço inicial, capacidade e vendas por evento, em poucas consultas."""
    stats = {i: {"min_price": None, "capacity": 0, "sold": 0, "types": 0} for i in ids}
    if not ids:
        return stats
    sold_sq = (
        select(Ticket.ticket_type_id.label("tid"), func.count(Ticket.id).label("n"))
        .where(Ticket.status != "cancelled").group_by(Ticket.ticket_type_id).subquery()
    )
    rows = db.execute(
        select(TicketType.event_id, TicketType.price_cents, TicketType.quantity, func.coalesce(sold_sq.c.n, 0))
        .outerjoin(sold_sq, sold_sq.c.tid == TicketType.id)
        .where(TicketType.event_id.in_(ids), TicketType.active)
    ).all()
    for eid, price, qty, sold in rows:
        s = stats[eid]
        s["types"] += 1
        s["capacity"] += qty
        s["sold"] += min(sold, qty)
        s["min_price"] = price if s["min_price"] is None else min(s["min_price"], price)
    return stats


def public_status(ev: Event, st: dict, today: date) -> str:
    if ev.status == "cancelled":
        return "cancelled"
    if ev.end_date < today:
        return "ended"
    if ev.start_date <= today:
        return "ongoing"
    if st["types"] == 0:
        return "soon"
    if st["sold"] >= st["capacity"]:
        return "sold_out"
    return "open"


def _show_place(ev: Event) -> bool:
    return ev.location_visibility == "public"


def has_marker(ev: Event) -> bool:
    return (
        ev.status == "published" and _show_place(ev) and ev.attendance_mode != "online"
        and ev.latitude is not None and ev.longitude is not None
    )


def card(ev: Event, org_name: str, st: dict, today: date, origin: tuple[float, float] | None = None) -> dict:
    visible = _show_place(ev)
    d = None
    if origin and has_marker(ev):
        d = round(haversine_km(origin[0], origin[1], ev.latitude, ev.longitude), 1)
    return {
        "id": ev.id,
        "slug": ev.slug,
        "name": ev.name,
        "organization": org_name,
        "start_date": ev.start_date,
        "end_date": ev.end_date,
        "category": ev.category,
        "category_label": CATEGORIES.get(ev.category, ev.category),
        "attendance_mode": ev.attendance_mode,
        "country": ev.country,
        "state": ev.state if ev.location_visibility != "hidden" else "",
        "city": ev.city if ev.location_visibility != "hidden" else "",
        "district": ev.district if visible else "",
        "venue": ev.venue if visible else "",
        "address": ev.address if visible else "",
        "location_visibility": ev.location_visibility,
        "latitude": ev.latitude if has_marker(ev) else None,
        "longitude": ev.longitude if has_marker(ev) else None,
        "age_rating": ev.age_rating,
        "banner_url": ev.banner_url,
        "status": public_status(ev, st, today),
        "min_price_cents": st["min_price"],
        "is_free": st["min_price"] == 0 and st["types"] > 0,
        "spots_left": max(st["capacity"] - st["sold"], 0) if st["types"] else None,
        "distance_km": d,
        "is_demo": ev.is_demo,
    }


def _cards(db: Session, rows, origin=None) -> list[dict]:
    today = date.today()
    stats = _ticket_stats(db, [ev.id for ev, _ in rows])
    return [card(ev, org, stats[ev.id], today, origin) for ev, org in rows]


# ---------- filtros ----------
def _like(term: str) -> str:
    return "%" + term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"


class Filters:
    def __init__(
        self,
        search: str | None = Query(None, max_length=100),
        where: str | None = Query(None, max_length=100, description="Cidade, estado, país ou região (texto livre)"),
        city: str | None = Query(None, max_length=100),
        state: str | None = Query(None, max_length=60),
        country: str | None = Query(None, min_length=2, max_length=2),
        category: str | None = Query(None, pattern="^(" + "|".join(CATEGORIES) + ")$"),
        start_date: date | None = None,
        end_date: date | None = None,
        attendance_mode: str | None = Query(None, pattern="^(presential|online|hybrid)$"),
        free: bool | None = None,
        open_sales: bool | None = None,
        include_past: bool = False,
        latitude: float | None = Query(None, ge=-90, le=90),
        longitude: float | None = Query(None, ge=-180, le=180),
        radius_km: float | None = Query(None, gt=0, le=20000),
    ):
        if end_date and start_date and end_date < start_date:
            raise HTTPException(422, "end_date deve ser igual ou posterior a start_date")
        if (latitude is None) != (longitude is None):
            raise HTTPException(422, "Informe latitude e longitude juntas")
        if radius_km is not None and latitude is None:
            raise HTTPException(422, "radius_km exige latitude e longitude")
        self.__dict__.update(locals())
        del self.__dict__["self"]

    @classmethod
    def make(cls, **kw):
        """Instancia fora do Depends (os defaults são objetos Query), com todos os filtros opcionais vazios."""
        names = ("search", "where", "city", "state", "country", "category", "start_date", "end_date", "attendance_mode",
                 "free", "open_sales", "latitude", "longitude", "radius_km")
        base = {n: None for n in names} | {"include_past": False}
        return cls(**(base | kw))

    @property
    def origin(self):
        return (self.latitude, self.longitude) if self.latitude is not None else None


_POSTGIS: dict = {}


def postgis_ready(db: Session) -> bool:
    """True se a coluna `events.geog` (migração 0002) existe — habilita ST_DWithin com índice GiST."""
    if "v" not in _POSTGIS:
        _POSTGIS["v"] = bool(
            db.get_bind().dialect.name == "postgresql"
            and db.execute(text("SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='geog'")).first()
        )
    return _POSTGIS["v"]


def _base(f: Filters, db: Session | None = None):
    q = select(Event, Organization.name).join(Organization, Organization.id == Event.organization_id).where(Event.status.in_(VISIBLE))
    today = date.today()
    if f.start_date or f.end_date:
        if f.start_date:
            q = q.where(Event.end_date >= f.start_date)
        if f.end_date:
            q = q.where(Event.start_date <= f.end_date)
    elif not f.include_past:
        q = q.where(Event.end_date >= today)

    if f.search:
        t = _like(f.search.strip())
        act = exists().where(ScheduleItem.event_id == Event.id, or_(ScheduleItem.title.ilike(t, escape="\\"), ScheduleItem.kind.ilike(t, escape="\\")))
        q = q.where(or_(
            Event.name.ilike(t, escape="\\"), Organization.name.ilike(t, escape="\\"), Event.description.ilike(t, escape="\\"),
            and_(Event.location_visibility == "public", Event.venue.ilike(t, escape="\\")), act,
        ))
    # eventos com localização oculta não casam com buscas por lugar (evita vazar a cidade)
    place = Event.location_visibility != "hidden"
    if f.where:
        t = _like(f.where.strip())
        q = q.where(place, or_(Event.city.ilike(t, escape="\\"), Event.state.ilike(t, escape="\\"), Event.country.ilike(t, escape="\\"),
                               and_(Event.location_visibility == "public", Event.district.ilike(t, escape="\\"))))
    if f.city:
        q = q.where(place, Event.city.ilike(f.city.strip(), escape="\\"))
    if f.state:
        q = q.where(place, Event.state.ilike(f.state.strip(), escape="\\"))
    if f.country:
        q = q.where(Event.country == f.country.upper())
    if f.category:
        q = q.where(Event.category == f.category)
    if f.attendance_mode:
        q = q.where(Event.attendance_mode == f.attendance_mode)
    if f.latitude is not None and f.radius_km:
        a, b, c, d = bounding_box(f.latitude, f.longitude, f.radius_km)
        q = q.where(
            Event.status == "published", Event.location_visibility == "public", Event.attendance_mode != "online",
            Event.latitude.between(a, b), Event.longitude.between(c, d),
        )
        if db is not None and postgis_ready(db):  # índice espacial; o haversine abaixo continua como filtro exato
            q = q.where(text("ST_DWithin(events.geog, ST_SetSRID(ST_MakePoint(:plon, :plat), 4326)::geography, :pr)").bindparams(
                plon=f.longitude, plat=f.latitude, pr=f.radius_km * 1000))
    if f.free:
        q = q.where(exists().where(TicketType.event_id == Event.id, TicketType.active, TicketType.price_cents == 0))
    return q


def _run(db: Session, f: Filters, sort: str):
    rows = db.execute(_base(f, db).order_by(Event.start_date, Event.id)).all()
    rows = [(ev, org) for ev, org in rows]
    if f.latitude is not None and f.radius_km:
        rows = [r for r in rows if has_marker(r[0]) and haversine_km(f.latitude, f.longitude, r[0].latitude, r[0].longitude) <= f.radius_km]
    items = _cards(db, rows, f.origin)
    if f.open_sales:
        items = [i for i in items if i["status"] == "open"]
    if sort == "name":
        items.sort(key=lambda i: i["name"].lower())
    elif sort == "newest":
        items.sort(key=lambda i: -i["id"])
    elif sort == "distance" and f.origin:
        items.sort(key=lambda i: (i["distance_km"] is None, i["distance_km"] or 0))
    elif sort == "price":
        items.sort(key=lambda i: (i["min_price_cents"] is None, i["min_price_cents"] or 0))
    return items


def _page(items: list, page: int, limit: int) -> dict:
    total = len(items)
    return {"items": items[(page - 1) * limit: page * limit], "total": total, "page": page, "limit": limit,
            "pages": max(1, math.ceil(total / limit))}


# ---------- endpoints ----------
@router.get("/events")
def list_events(
    f: Filters = Depends(),
    sort: str = Query("date", pattern="^(date|name|distance|newest|price)$"),
    page: int = Query(1, ge=1, le=10_000),
    limit: int = Query(20, ge=1, le=MAX_LIMIT),
    db: Session = Depends(get_db),
):
    if sort == "distance" and not f.origin:
        raise HTTPException(422, "Ordenar por distância exige latitude e longitude")
    return _page(_run(db, f, sort), page, limit)


@router.get("/events/map")
def map_events(f: Filters = Depends(), limit: int = Query(500, ge=1, le=1000), db: Session = Depends(get_db)):
    """Somente eventos publicados, presenciais/híbridos, com localização pública e coordenadas válidas."""
    items = [i for i in _run(db, f, "date") if i["latitude"] is not None][:limit]
    return {"items": items, "total": len(items)}


@router.get("/events/nearby")
def nearby_events(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
    radius_km: float = Query(100, gt=0, le=2000),
    limit: int = Query(20, ge=1, le=MAX_LIMIT),
    include_past: bool = False,
    db: Session = Depends(get_db),
):
    """Distância em linha reta (aproximada) — não é distância rodoviária. As coordenadas do visitante não são gravadas."""
    f = Filters.make(latitude=latitude, longitude=longitude, radius_km=radius_km, include_past=include_past)
    items = _run(db, f, "distance")
    return {"items": items[:limit], "total": len(items), "radius_km": radius_km, "distance_kind": "straight_line"}


@router.get("/events/{slug}")
def event_detail(slug: str, db: Session = Depends(get_db), user: User | None = Depends(optional_user)):
    row = db.execute(
        select(Event, Organization.name).join(Organization, Organization.id == Event.organization_id).where(Event.slug == slug)
    ).first()
    # rascunhos: pré-visualização privada, só para a equipe da própria organização
    preview = bool(row and row[0].status == "draft" and user and user.role in ("admin", "volunteer") and user.organization_id == row[0].organization_id)
    if not row or (row[0].status not in VISIBLE and not preview):
        raise HTTPException(404, "Evento não encontrado")
    ev, org = row
    data = _cards(db, [(ev, org)])[0]
    st = _ticket_stats(db, [ev.id])[ev.id]
    sold = dict(db.execute(
        select(Ticket.ticket_type_id, func.count(Ticket.id)).where(Ticket.event_id == ev.id, Ticket.status != "cancelled")
        .group_by(Ticket.ticket_type_id)
    ).all())
    types = db.scalars(select(TicketType).where(TicketType.event_id == ev.id, TicketType.active).order_by(TicketType.price_cents)).all()
    schedule = db.scalars(select(ScheduleItem).where(ScheduleItem.event_id == ev.id).order_by(ScheduleItem.starts_at)).all()
    artists = db.scalars(select(Application).where(Application.event_id == ev.id, Application.status == "approved")
                         .order_by(Application.display_name)).all()
    places = db.scalars(select(Place).where(Place.event_id == ev.id).order_by(Place.kind, Place.name)).all()
    can_buy = data["status"] in ("open", "ongoing")
    data.update(
        description=ev.description,
        postal_code=ev.postal_code if _show_place(ev) else "",
        timezone=ev.timezone,
        online_url="",  # link só é entregue a quem tem ingresso
        capacity=ev.capacity,
        care_guidelines=ev.care_guidelines,
        indexable=ev.status == "published",
        preview=preview,
        ticket_types=[
            {"id": t.id, "name": t.name, "description": t.description, "price_cents": t.price_cents, "is_vip": t.is_vip,
             "left": max(t.quantity - sold.get(t.id, 0), 0), "purchasable": can_buy and t.quantity - sold.get(t.id, 0) > 0}
            for t in types
        ],
        schedule=[ScheduleOut.model_validate(s).model_dump(mode="json") for s in schedule],
        artists=[ArtistPublicOut(id=a.id, kind=a.kind, display_name=a.display_name, description=a.description,
                                 portfolio_url=a.portfolio_url, table_label=a.table_label).model_dump() for a in artists],
        places=[PlaceOut.model_validate(p).model_dump() for p in places],
        sections={  # abas exibidas na página; seções vazias ficam ocultas
            "schedule": bool(schedule), "tickets": bool(types), "artists": any(a.kind == "artist" for a in artists),
            "dealers": any(a.kind == "dealer" for a in artists), "map": bool(places),
            "parade": any(s.kind == "parade" for s in schedule), "care": bool(ev.care_guidelines),
        },
    )
    del st
    return data


@router.get("/categories")
def categories(db: Session = Depends(get_db)):
    counts = dict(db.execute(
        select(Event.category, func.count(Event.id)).where(Event.status == "published", Event.end_date >= date.today())
        .group_by(Event.category)
    ).all())
    return [{"key": k, "label": v, "upcoming": counts.get(k, 0)} for k, v in CATEGORIES.items()]


@router.get("/highlights")
def highlights(db: Session = Depends(get_db)):
    """Seções editoriais. 'Popular' = mais ingressos emitidos (métrica real, ver `popular_metric`)."""
    items = _run(db, Filters.make(), "date")
    soon = [i for i in items if i["status"] in ("open", "soon", "sold_out", "ongoing")]
    sold = dict(db.execute(select(Ticket.event_id, func.count(Ticket.id)).where(Ticket.status != "cancelled").group_by(Ticket.event_id)).all())
    popular = sorted((i for i in soon if sold.get(i["id"])), key=lambda i: -sold[i["id"]])[:6]
    return {
        "featured": [i for i in soon if i["category"] == "convention"][:6],
        "newest": sorted(soon, key=lambda i: -i["id"])[:6],
        "popular": popular,
        "popular_metric": "tickets_issued",
        "free": [i for i in soon if i["is_free"]][:6],
        "online": [i for i in soon if i["attendance_mode"] in ("online", "hybrid")][:6],
        "artist_fairs": [i for i in soon if i["category"] == "artist_fair"][:6],
        "open_sales": [i for i in soon if i["status"] == "open"][:6],
    }


@router.get("/calendar")
def calendar(
    start: date = Query(...), end: date = Query(...), category: str | None = Query(None, pattern="^(" + "|".join(CATEGORIES) + ")$"),
    db: Session = Depends(get_db),
):
    if end < start or (end - start).days > 400:
        raise HTTPException(422, "Intervalo inválido (máximo de 400 dias)")
    f = Filters.make(start_date=start, end_date=end, category=category)
    return {"items": _run(db, f, "date")}


def _ics_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\r", "").replace("\n", "\\n")


def _ics(items: list[dict], name: str) -> Response:
    now = utcnow().strftime("%Y%m%dT%H%M%SZ")
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FurCon Hub//Eventos//PT-BR", "CALSCALE:GREGORIAN", f"X-WR-CALNAME:{_ics_escape(name)}"]
    for i in items:
        loc = ", ".join(x for x in (i["venue"], i["city"], i["state"]) if x)
        lines += [
            "BEGIN:VEVENT", f"UID:event-{i['id']}@furconhub", f"DTSTAMP:{now}",
            f"DTSTART;VALUE=DATE:{i['start_date']:%Y%m%d}", f"DTEND;VALUE=DATE:{(i['end_date'] + timedelta(days=1)):%Y%m%d}",
            f"SUMMARY:{_ics_escape(i['name'])}", f"LOCATION:{_ics_escape(loc)}",
            f"URL:/eventos/{i['slug']}", "STATUS:CANCELLED" if i["status"] == "cancelled" else "STATUS:CONFIRMED", "END:VEVENT",
        ]
    lines.append("END:VCALENDAR")
    return Response("\r\n".join(lines) + "\r\n", media_type="text/calendar; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{name}.ics"'})


@router.get("/calendar.ics")
def calendar_ics(category: str | None = Query(None, pattern="^(" + "|".join(CATEGORIES) + ")$"), db: Session = Depends(get_db)):
    return _ics(_run(db, Filters.make(category=category), "date"), "furcon-hub-eventos")


@router.get("/events/{slug}/calendar.ics")
def event_ics(slug: str, db: Session = Depends(get_db)):
    ev = event_detail(slug, db, None)
    return _ics([ev], slug)


@router.get("/sitemap.xml")
def sitemap(request: Request, db: Session = Depends(get_db)):
    """Somente páginas indexáveis (publicadas). Rascunhos e cancelados ficam de fora."""
    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    base = f"{proto}://{request.headers.get('host', request.url.netloc)}"
    urls = [f"<url><loc>{base}{p}</loc></url>" for p in ("/", "/eventos", "/mapa", "/calendario", "/planos", "/para-organizadores", "/sobre")]
    for slug, created in db.execute(select(Event.slug, Event.created_at).where(Event.status == "published", Event.slug.is_not(None))).all():
        urls.append(f"<url><loc>{base}/eventos/{escape(slug)}</loc><lastmod>{created.date().isoformat()}</lastmod></url>")
    xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + "".join(urls) + "</urlset>"
    return Response(xml, media_type="application/xml")


@router.get("/artists")
def artists(db: Session = Depends(get_db)):
    rows = db.execute(
        select(Application, Event.name, Event.slug).join(Event, Event.id == Application.event_id)
        .where(Application.status == "approved", Application.kind == "artist", Event.status == "published", Event.end_date >= date.today())
        .order_by(Application.display_name)
    ).all()
    return [
        {"id": a.id, "display_name": a.display_name, "description": a.description, "portfolio_url": a.portfolio_url,
         "table_label": a.table_label, "event_name": en, "event_slug": es}
        for a, en, es in rows
    ]


# ---------- checkout como convidado ----------
_HITS: dict[str, list[float]] = {}


def _limit(key: str, n: int, window: int = 3600) -> None:
    now = time.time()
    hits = [t for t in _HITS.get(key, []) if now - t < window]
    if len(hits) >= n:
        raise HTTPException(429, "Muitas tentativas. Tente novamente mais tarde.")
    _HITS[key] = hits + [now]


def _ip(request: Request) -> str:
    return request.client.host if request.client else "?"


class GuestCheckoutIn(BaseModel):
    ticket_type_id: int
    badge_name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    payment_method: str = Field("pix", pattern="^(pix|card)$")
    accept_privacy: bool


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


@router.post("/events/{slug}/guest-checkout", status_code=201)
def guest_checkout(slug: str, body: GuestCheckoutIn, request: Request, db: Session = Depends(get_db)):
    """Compra sem conta. O ingresso só é acessível por um link secreto, exibido uma única vez (o servidor guarda apenas o hash)."""
    _limit(f"guest:{_ip(request)}", 10)
    if not body.accept_privacy:
        raise HTTPException(422, "É necessário aceitar a política de privacidade")
    ev = db.scalar(select(Event).where(Event.slug == slug, Event.status == "published"))
    if not ev:
        raise HTTPException(404, "Evento não encontrado")
    token = secrets.token_urlsafe(32)
    t = issue_ticket(db, ev, body.ticket_type_id, body.badge_name, body.payment_method,
                     guest_email=body.email.lower(), guest_token_hash=_hash(token))
    db.commit()
    return {"ticket_id": t.id, "access_path": f"/ingresso/{token}",
            "notice": "Guarde este link: ele é o único acesso ao seu ingresso e não será exibido novamente."}


@router.get("/tickets/{token}")
def guest_ticket(token: str, request: Request, db: Session = Depends(get_db)):
    _limit(f"tk:{_ip(request)}", 60, 600)
    t = db.scalar(select(Ticket).where(Ticket.guest_token_hash == _hash(token)))
    if not t or t.status == "cancelled":
        raise HTTPException(404, "Ingresso não encontrado")
    ev, tt = db.get(Event, t.event_id), db.get(TicketType, t.ticket_type_id)
    return {"code": t.code, "badge_name": t.badge_name, "status": t.status, "ticket_type": tt.name, "price_cents": t.price_cents,
            "event_name": ev.name, "event_slug": ev.slug, "start_date": ev.start_date, "end_date": ev.end_date, "city": ev.city,
            "venue": ev.venue if _show_place(ev) else ""}


# ---------- contato ----------
class ContactIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    subject: str = Field("", max_length=160)
    message: str = Field(min_length=10, max_length=4000)
    accept_privacy: bool


@router.post("/contact", status_code=201)
def contact(body: ContactIn, request: Request, db: Session = Depends(get_db)):
    _limit(f"contact:{_ip(request)}", 5)
    if not body.accept_privacy:
        raise HTTPException(422, "É necessário aceitar a política de privacidade")
    db.add(ContactMessage(name=body.name.strip(), email=body.email.lower(), subject=body.subject.strip(), message=body.message.strip()))
    db.commit()
    return {"ok": True}


# ---------- SEO: HTML do SPA com meta tags do evento (o nginx encaminha /eventos/:slug para cá) ----------
_SHELL: dict = {"at": 0.0, "html": ""}


def _shell() -> str:
    if time.time() - _SHELL["at"] > 60 or not _SHELL["html"]:
        with urllib.request.urlopen(get_settings().frontend_shell_url, timeout=3) as r:  # noqa: S310
            _SHELL.update(at=time.time(), html=r.read().decode())
    return _SHELL["html"]


def _jsonld(d: dict, base: str) -> dict:
    mode = {"online": "OnlineEventAttendanceMode", "hybrid": "MixedEventAttendanceMode"}.get(d["attendance_mode"], "OfflineEventAttendanceMode")
    out = {"@context": "https://schema.org", "@type": "Event", "name": d["name"], "startDate": d["start_date"].isoformat(),
           "endDate": d["end_date"].isoformat(), "description": d["description"][:300], "url": f"{base}/eventos/{d['slug']}",
           "eventAttendanceMode": f"https://schema.org/{mode}",
           "eventStatus": "https://schema.org/EventCancelled" if d["status"] == "cancelled" else "https://schema.org/EventScheduled",
           "organizer": {"@type": "Organization", "name": d["organization"]}}
    if d["attendance_mode"] != "online" and d["venue"]:
        out["location"] = {"@type": "Place", "name": d["venue"], "address": {"@type": "PostalAddress", "streetAddress": d["address"],
                           "addressLocality": d["city"], "addressRegion": d["state"], "addressCountry": d["country"]}}
    if d["banner_url"]:
        out["image"] = d["banner_url"]
    return out


@router.get("/ssr/eventos/{slug}", include_in_schema=False)
def ssr_event(slug: str, request: Request, db: Session = Depends(get_db)):
    try:
        shell = _shell()
    except Exception:  # noqa: BLE001
        raise HTTPException(502, "Shell do frontend indisponível") from None
    try:
        d = event_detail(slug, db, None)
    except HTTPException:
        return Response(shell, status_code=200, media_type="text/html")  # o SPA mostra a página "não encontrado"
    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    base = f"{proto}://{request.headers.get('host', request.url.netloc)}"
    e = lambda v: html.escape(str(v), quote=True)  # noqa: E731
    title = f"{d['name']} · FurCon Hub"
    place = ", ".join(x for x in (d["city"], d["state"]) if x) or "Online"
    desc = f"{d['name']} — {d['start_date']:%d/%m/%Y} a {d['end_date']:%d/%m/%Y} · {place}. {d['description'][:120]}"
    tags = [f"<title>{e(title)}</title>", f'<meta name="description" content="{e(desc)}" />', f'<link rel="canonical" href="{e(base)}/eventos/{e(slug)}" />',
            f'<meta property="og:title" content="{e(title)}" />', f'<meta property="og:description" content="{e(desc)}" />',
            f'<meta property="og:url" content="{e(base)}/eventos/{e(slug)}" />', '<meta property="og:type" content="website" />',
            f'<meta name="robots" content="{"index,follow" if d["indexable"] else "noindex,nofollow"}" />']
    if d["banner_url"]:
        tags.append(f'<meta property="og:image" content="{e(d["banner_url"])}" />')
    if d["indexable"]:
        ld = json.dumps(_jsonld(d, base), ensure_ascii=False).replace("</", "<\\/")
        tags.append(f'<script id="ld-json" type="application/ld+json">{ld}</script>')
    page = re.sub(r"<title>.*?</title>", "", shell, flags=re.S)
    page = re.sub(r'<meta name="description"[^>]*>', "", page)
    page = page.replace("</head>", "\n".join(tags) + "</head>", 1)
    fallback = (f"<noscript><h1>{e(d['name'])}</h1><p>{e(desc)}</p><p>Organização: {e(d['organization'])}</p></noscript>")
    page = page.replace('<div id="root"></div>', f'<div id="root"></div>{fallback}', 1)
    return Response(page, media_type="text/html", headers={"Cache-Control": "public, max-age=60"})
