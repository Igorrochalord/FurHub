"""Dados demonstrativos. Tudo é marcado como DEMO (flag is_demo + prefixo [DEMO] nos nomes)."""

import random
import secrets
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import (
    Achievement,
    Announcement,
    Application,
    Event,
    Expense,
    Fursona,
    Organization,
    Place,
    ScheduleItem,
    Shift,
    ShiftAssignment,
    Ticket,
    TicketType,
    User,
    utcnow,
)
from .security import hash_password
from .services.payments import processing_fee_cents

DEMO_PASSWORD = "Demo@12345"
DEMO_ACCOUNTS = {
    "admin": "admin@demo.example.com",
    "volunteer": "voluntario@demo.example.com",
    "artist": "artista@demo.example.com",
    "participant": "participante@demo.example.com",
}


def seed_demo(db: Session) -> bool:
    if db.scalar(select(User.id).where(User.email == DEMO_ACCOUNTS["admin"])):
        seed_public_demo(db)
        return False
    rnd = random.Random(42)
    now = utcnow()
    pw = hash_password(DEMO_PASSWORD)
    org = Organization(name="[DEMO] Associação Exemplo", plan="pro")
    db.add(org)
    db.flush()

    def user(key, name, role, org_id=None):
        u = User(email=DEMO_ACCOUNTS[key], name=name, role=role, organization_id=org_id, password_hash=pw,
                 is_demo=True, privacy_accepted_at=now)
        db.add(u)
        return u

    admin = user("admin", "[DEMO] Ana Organizadora", "admin", org.id)
    vol = user("volunteer", "[DEMO] Vini Voluntário", "volunteer", org.id)
    artist = user("artist", "[DEMO] Ari Artista", "artist")
    part = user("participant", "[DEMO] Pê Participante", "participant")
    db.flush()

    start = (now + timedelta(days=21)).date()
    ev = Event(
        organization_id=org.id, name="[DEMO] Brasil Furry Expo", status="published", is_demo=True,
        description="Evento fictício para demonstração da plataforma FurCon Hub. Nenhum dado aqui é real.",
        venue="Centro de Convenções Exemplo", city="São Paulo", state="SP", latitude=-23.5505, longitude=-46.6333,
        address="Endereço de demonstração, 100", category="convention", start_date=start, end_date=start + timedelta(days=2),
        capacity=600, budget_cents=18_000_00,
        care_guidelines=(
            "Faça pausas a cada 30–40 minutos nos lounges. Mantenha-se hidratado: há pontos de água em todos os andares. "
            "Handlers: acompanhem o fursuiter em áreas cheias e combinem um sinal de pausa. "
            "Use o botão de ajuda do app para chamar a equipe."
        ),
    )
    db.add(ev)
    db.flush()
    from .services.slugs import assign_slug

    assign_slug(db, ev)

    types = [
        TicketType(event_id=ev.id, name="Lote 1 — Individual", description="Acesso aos 3 dias", price_cents=12000, quantity=200),
        TicketType(event_id=ev.id, name="Lote 2 — Individual", description="Acesso aos 3 dias", price_cents=15000, quantity=250),
        TicketType(event_id=ev.id, name="VIP", description="Fila prioritária, lounge VIP e brinde", price_cents=32000, quantity=60, is_vip=True),
        TicketType(event_id=ev.id, name="Meia-entrada / Fursuiter", description="Inscrição de fursuiter com benefícios", price_cents=9000, quantity=90),
    ]
    db.add_all(types)
    db.flush()

    # histórico de vendas
    names = ["Luna", "Kai", "Nox", "Mika", "Rex", "Zuri", "Bolt", "Safira", "Tio Lobo", "Pixel", "Ember", "Nuvem"]
    weights = [30, 35, 10, 25]
    n_sales = 148
    for i in range(n_sales):
        tt = rnd.choices(types, weights)[0]
        days_ago = int(rnd.triangular(0, 45, 30))
        created = now - timedelta(days=days_ago, hours=rnd.randint(0, 23))
        db.add(Ticket(
            event_id=ev.id, ticket_type_id=tt.id, code=secrets.token_urlsafe(16), badge_name=f"{rnd.choice(names)} #{i + 1}",
            price_cents=tt.price_cents, fee_cents=processing_fee_cents(tt.price_cents),
            payment_method=rnd.choice(["pix", "pix", "card"]), created_at=created,
        ))
    my_ticket = Ticket(
        event_id=ev.id, ticket_type_id=types[2].id, user_id=part.id, code=secrets.token_urlsafe(16), badge_name="Khaz",
        price_cents=types[2].price_cents, fee_cents=processing_fee_cents(types[2].price_cents), payment_method="pix",
    )
    db.add(my_ticket)
    db.add(Fursona(user_id=part.id, name="Khaz", species="Lobo-guará", color="#a78bfa", is_public=True,
                   bio="Perfil de demonstração."))

    def at(day, hh, mm=0):
        return datetime.combine(start + timedelta(days=day), datetime.min.time()) + timedelta(hours=hh, minutes=mm)

    sched = [
        (0, 10, 12, "Abertura oficial", "panel", "Auditório Principal", "Equipe organizadora", None),
        (0, 13, 14, "Workshop: Fundamentos de fursuit making", "workshop", "Sala Oficina 1", "[DEMO] Convidado A", 30),
        (0, 15, 16, "Painel: Comunidade furry no Brasil", "panel", "Auditório Principal", "[DEMO] Convidado B", None),
        (0, 20, 23, "Festa de abertura", "party", "Salão de Festas", "DJ [DEMO]", None),
        (1, 11, 12, "Workshop: Anatomia para desenho de personagens", "workshop", "Sala Oficina 2", "[DEMO] Convidado C", 25),
        (1, 14, 15, "Desfile de fursuits", "parade", "Hall Central", "", None),
        (1, 16, 18, "Concurso de fursuit", "contest", "Auditório Principal", "", None),
        (1, 19, 20, "Jogos de tabuleiro e RPG", "game", "Sala de Jogos", "", 40),
        (2, 11, 12, "Painel: Cuidados e saúde dentro do fursuit", "panel", "Auditório Principal", "Equipe Fursuit Care", None),
        (2, 14, 15, "Desfile de encerramento", "parade", "Hall Central", "", None),
        (2, 16, 17, "Encerramento e leilão beneficente", "contest", "Auditório Principal", "", None),
    ]
    for d, h1, h2, title, kind, room, speaker, cap in sched:
        db.add(ScheduleItem(event_id=ev.id, title=title, kind=kind, room=room, speaker=speaker, starts_at=at(d, h1),
                            ends_at=at(d, h2), capacity=cap, description="Atividade de demonstração."))

    for name, kind, desc, hours, x, y in [
        ("Entrada e credenciamento", "entrance", "Check-in por QR Code e retirada de crachá.", "08:00–20:00", 12, 82),
        ("Auditório Principal", "room", "Painéis, concursos e cerimônias.", "", 70, 25),
        ("Hall Central", "room", "Desfiles e circulação.", "", 45, 55),
        ("Artist Alley", "artist_alley", "Mesas de artistas.", "10:00–19:00", 25, 28),
        ("Dealers Den", "dealers", "Vendedores e lojas.", "10:00–19:00", 22, 48),
        ("Lounge Fursuit", "lounge", "Ar-condicionado, espelhos e kit de reparo. Prioridade a fursuiters.", "09:00–23:00", 82, 60),
        ("Ponto de hidratação — Hall", "hydration", "Água gelada e isotônico.", "09:00–23:00", 52, 72),
        ("Ponto de hidratação — Auditório", "hydration", "Água gelada.", "09:00–23:00", 62, 12),
        ("Área de descanso", "rest", "Poltronas e ventilação. Silêncio, por favor.", "09:00–23:00", 88, 38),
        ("Posto médico", "medical", "Atendimento de primeiros socorros.", "24h durante o evento", 90, 82),
    ]:
        db.add(Place(event_id=ev.id, name=name, kind=kind, description=desc, hours=hours, x=x, y=y))

    for name, desc, cat, pts, code in [
        ("Primeira vez no hall", "Participe do desfile ou assista a ele.", "activity", 10, "DESFILE"),
        ("Apoiador de artistas", "Visite 3 mesas da Artist Alley.", "artist", 20, "ARTIST3"),
        ("Aprendiz", "Compareça a um workshop.", "workshop", 15, "WORKSHOP"),
        ("Coração solidário", "Participe do leilão beneficente.", "charity", 30, "LEILAO"),
    ]:
        db.add(Achievement(event_id=ev.id, name=name, description=desc, category=cat, points=pts, claim_code=code))

    db.add(Application(event_id=ev.id, user_id=artist.id, kind="artist", display_name="[DEMO] Ari Art",
                       description="Ilustração digital e comissões de personagens.", portfolio_url="https://example.com/ari",
                       status="approved", table_label="A-01", fee_cents=15000))

    for title, area, d, h1, h2, slots in [
        ("Credenciamento (manhã)", "Entrada", 0, 8, 12, 3),
        ("Apoio Fursuit Care", "Lounge", 1, 12, 18, 2),
        ("Controle de acesso — auditório", "Auditório", 1, 15, 19, 2),
    ]:
        s = Shift(event_id=ev.id, title=title, area=area, starts_at=at(d, h1), ends_at=at(d, h2), slots=slots)
        db.add(s)
        db.flush()
        if title.startswith("Credenciamento"):
            db.add(ShiftAssignment(shift_id=s.id, user_id=vol.id))

    for cat, desc, amount in [
        ("Local", "Locação do espaço (sinal)", 9000_00), ("Estrutura", "Som e iluminação", 3200_00),
        ("Marketing", "Impulsionamento e design", 1100_00), ("Segurança", "Equipe terceirizada (sinal)", 1500_00),
    ]:
        db.add(Expense(event_id=ev.id, category=cat, description=desc, amount_cents=amount))

    db.add(Announcement(event_id=ev.id, author_id=admin.id, title="Bem-vindos à edição de demonstração",
                        body="Este é um evento fictício. Explore a programação, o mapa e o módulo Fursuit Care."))
    db.commit()
    seed_public_demo(db)
    return True


# (nome, categoria, modo, cidade, UF, lat, lon, dias até início, duração, preço padrão em centavos, visibilidade)
PUBLIC_DEMOS = [
    ("[DEMO] Encontro Furry Brasília", "meetup", "presential", "Brasília", "DF", -15.7939, -47.8828, 35, 1, 0, "public"),
    ("[DEMO] Furry Festival Sul", "festival", "presential", "Curitiba", "PR", -25.4284, -49.2733, 60, 2, 8000, "public"),
    ("[DEMO] Feira de Artistas Carioca", "artist_fair", "presential", "Rio de Janeiro", "RJ", -22.9068, -43.1729, 45, 1, 2000, "public"),
    ("[DEMO] Noite de Jogos Furry", "games", "presential", "Belo Horizonte", "MG", -19.9167, -43.9345, 14, 0, 0, "public"),
    ("[DEMO] Convenção Nordeste Furry", "convention", "presential", "Recife", "PE", -8.0476, -34.8770, 120, 2, 11000, "public"),
    ("[DEMO] Workshop Online de Fursuit", "workshop", "online", "", "", None, None, 10, 0, 0, "public"),
    ("[DEMO] Encontro Beneficente (local a divulgar)", "charity", "presential", "Porto Alegre", "RS", -30.0346, -51.2177, 75, 0, 3000, "city_only"),
]


def seed_public_demo(db: Session) -> None:
    """Eventos de DEMONSTRAÇÃO para o portal público/mapa. Idempotente; nada aqui é um evento real."""
    from .services.slugs import assign_slug

    org = db.scalar(select(Organization).where(Organization.name == "[DEMO] Associação Exemplo"))
    if not org:
        return
    for ev in db.scalars(select(Event).where(Event.organization_id == org.id, Event.latitude.is_(None), Event.name == "[DEMO] Brasil Furry Expo")):
        ev.city, ev.state, ev.latitude, ev.longitude = "São Paulo", "SP", -23.5505, -46.6333
    today = utcnow().date()
    for name, cat, mode, city, uf, lat, lon, ahead, dur, price, vis in PUBLIC_DEMOS:
        if db.scalar(select(Event.id).where(Event.name == name)):
            continue
        ev = Event(
            organization_id=org.id, name=name, status="published", is_demo=True, category=cat, attendance_mode=mode,
            description="Evento FICTÍCIO de demonstração da FurCon Hub. Local, datas e valores são exemplos; nada aqui é real.",
            venue="Local de demonstração" if mode != "online" else "", city=city, state=uf, country="BR",
            address="Endereço de demonstração" if mode != "online" else "", latitude=lat, longitude=lon,
            location_visibility=vis, start_date=today + timedelta(days=ahead), end_date=today + timedelta(days=ahead + dur),
            capacity=300, age_rating="L" if cat != "festival" else "16",
            online_url="https://example.com/demo" if mode == "online" else "",
        )
        db.add(ev)
        db.flush()
        assign_slug(db, ev)
        db.add(TicketType(event_id=ev.id, name="Entrada geral" if price else "Inscrição gratuita", price_cents=price, quantity=300))
    db.commit()
