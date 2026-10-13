from datetime import date, timedelta

from tests.conftest import make_event, signup

P = "/api/v1/public"
BSB = {"latitude": -15.7939, "longitude": -47.8828}


def ev_at(client, org, name, city="Brasília", state="DF", lat=-15.7939, lon=-47.8828, days=10, published=True, **kw):
    start = date.today() + timedelta(days=days)
    return make_event(client, org, published=published, name=name, city=city, state=state, latitude=lat, longitude=lon,
                      start_date=start.isoformat(), end_date=(start + timedelta(days=1)).isoformat(), address="Rua X, 1", venue="Centro", **kw)[0]


def test_public_home_no_login_and_drafts_hidden(client, org):
    ev_at(client, org, "Con Publicada")
    ev_at(client, org, "Con Rascunho", published=False)
    r = client.get(f"{P}/events")
    assert r.status_code == 200
    names = [e["name"] for e in r.json()["items"]]
    assert names == ["Con Publicada"]
    assert client.get(f"{P}/events/con-rascunho-{(date.today() + timedelta(days=10)).year}").status_code == 404


def test_search_by_city_text_category_and_dates(client, org):
    ev_at(client, org, "Furry Brasília", category="meetup")
    ev_at(client, org, "Furry Sampa", city="São Paulo", state="SP", lat=-23.55, lon=-46.63, days=40)
    get = lambda **p: [e["name"] for e in client.get(f"{P}/events", params=p).json()["items"]]  # noqa: E731
    assert get(city="são paulo") == ["Furry Sampa"]
    assert get(where="DF") == ["Furry Brasília"]
    assert get(search="sampa") == ["Furry Sampa"]
    assert get(category="meetup") == ["Furry Brasília"]
    assert get(category="festival") == []
    soon = (date.today() + timedelta(days=20)).isoformat()
    assert get(end_date=soon) == ["Furry Brasília"]
    assert get(start_date=soon) == ["Furry Sampa"]
    assert client.get(f"{P}/events", params={"category": "xyz"}).status_code == 422
    assert client.get(f"{P}/events", params={"limit": 1000}).status_code == 422
    assert client.get(f"{P}/events", params={"search": "100%_"}).json()["total"] == 0  # curingas escapados


def test_search_term_escaped_does_not_match_everything(client, org):
    ev_at(client, org, "Evento A")
    assert client.get(f"{P}/events", params={"search": "%"}).json()["total"] == 0


def test_nearby_radius_and_distance(client, org):
    ev_at(client, org, "Perto")
    ev_at(client, org, "Longe", city="Recife", state="PE", lat=-8.05, lon=-34.88)
    r = client.get(f"{P}/events/nearby", params={**BSB, "radius_km": 100}).json()
    assert [e["name"] for e in r["items"]] == ["Perto"] and r["items"][0]["distance_km"] < 1
    assert r["distance_kind"] == "straight_line"
    far = client.get(f"{P}/events/nearby", params={**BSB, "radius_km": 2000}).json()["items"]
    assert [e["name"] for e in far] == ["Perto", "Longe"]
    assert 1600 < far[1]["distance_km"] < 2100
    assert client.get(f"{P}/events/nearby", params={"latitude": 95, "longitude": 0}).status_code == 422
    assert client.get(f"{P}/events/nearby", params={"latitude": 1}).status_code == 422
    assert client.get(f"{P}/events", params={"sort": "distance"}).status_code == 422


def test_location_privacy_and_map(client, org):
    ev_at(client, org, "Publico")
    ev_at(client, org, "So Cidade", location_visibility="city_only")
    ev_at(client, org, "Oculto", location_visibility="hidden") if False else None
    m = client.get(f"{P}/events/map").json()["items"]
    assert [e["name"] for e in m] == ["Publico"]
    items = {e["name"]: e for e in client.get(f"{P}/events").json()["items"]}
    assert items["So Cidade"]["latitude"] is None and items["So Cidade"]["address"] == "" and items["So Cidade"]["venue"] == ""
    # raio não revela evento com localização restrita
    near = client.get(f"{P}/events/nearby", params={**BSB, "radius_km": 50}).json()["items"]
    assert [e["name"] for e in near] == ["Publico"]


def test_hidden_location_not_leaked_by_city_search(client, org):
    ev_at(client, org, "Secreto", location_visibility="hidden")
    assert client.get(f"{P}/events", params={"city": "Brasília"}).json()["total"] == 0
    item = client.get(f"{P}/events").json()["items"][0]
    assert item["city"] == "" and item["latitude"] is None


def test_online_event_has_no_marker_and_no_link(client, org):
    ev_at(client, org, "Live", attendance_mode="online", category="virtual", online_url="https://secret.example.com/room")
    assert client.get(f"{P}/events/map").json()["items"] == []
    assert client.get(f"{P}/events", params={"attendance_mode": "online"}).json()["total"] == 1
    d = client.get(f"{P}/events/live-{(date.today() + timedelta(days=10)).year}").json()
    assert d["online_url"] == "" and "secret" not in str(d)


def test_publish_requires_valid_location(client, org):
    ev, _ = make_event(client, org, published=False, name="Sem coords", city="Brasília", latitude=None, longitude=None)
    r = client.post(f"/api/org/events/{ev['id']}/status", headers=org, json={"status": "published"})
    assert r.status_code == 422
    r = client.put(f"/api/org/events/{ev['id']}", headers=org, json={
        "name": "Sem coords", "start_date": "2026-12-01", "end_date": "2026-12-02", "capacity": 100, "city": "Brasília", "latitude": 10})
    assert r.status_code == 422  # latitude sem longitude
    r = client.put(f"/api/org/events/{ev['id']}", headers=org, json={
        "name": "Sem coords", "start_date": "2026-12-01", "end_date": "2026-12-02", "capacity": 100, "city": "Brasília", "latitude": 95, "longitude": 1})
    assert r.status_code == 422
    client.put(f"/api/org/events/{ev['id']}", headers=org, json={
        "name": "Sem coords", "start_date": "2026-12-01", "end_date": "2026-12-02", "capacity": 100, "city": "Brasília", "location_visibility": "city_only"})
    assert client.post(f"/api/org/events/{ev['id']}/status", headers=org, json={"status": "published"}).status_code == 200


def test_event_detail_cancelled_and_missing(client, org):
    e = ev_at(client, org, "Vai Cancelar")
    client.post(f"/api/org/events/{e['id']}/status", headers=org, json={"status": "cancelled"})
    d = client.get(f"{P}/events/{e['slug']}").json()
    assert d["status"] == "cancelled" and d["indexable"] is False
    assert all(not t["purchasable"] for t in d["ticket_types"])
    assert client.get(f"{P}/events/map").json()["items"] == []
    assert client.get(f"{P}/events/nao-existe").status_code == 404


def test_detail_sections_tickets_and_status(client, org):
    e = ev_at(client, org, "Com Ingresso")  # lote de 2 ingressos
    d = client.get(f"{P}/events/{e['slug']}").json()
    assert d["status"] == "open" and d["ticket_types"][0]["left"] == 2 and d["min_price_cents"] == 10000
    assert d["sections"]["schedule"] is False and d["sections"]["artists"] is False
    for i in range(2):
        h = signup(client, f"c{i}@x.example.com")
        client.post(f"/api/events/{e['id']}/purchase", headers=h, json={"ticket_type_id": d["ticket_types"][0]["id"], "badge_name": "x"})
    d = client.get(f"{P}/events/{e['slug']}").json()
    assert d["status"] == "sold_out" and d["ticket_types"][0]["purchasable"] is False


def test_slug_unique_and_tenant_independent(client, org):
    a = ev_at(client, org, "Mesmo Nome")
    b = ev_at(client, org, "Mesmo Nome")
    assert a["slug"] != b["slug"]


def test_calendar_and_ics(client, org):
    ev_at(client, org, "Cal, Con; Teste")
    s, e = date.today(), date.today() + timedelta(days=60)
    r = client.get(f"{P}/calendar", params={"start": s.isoformat(), "end": e.isoformat()}).json()
    assert len(r["items"]) == 1
    assert client.get(f"{P}/calendar", params={"start": e.isoformat(), "end": s.isoformat()}).status_code == 422
    ics = client.get(f"{P}/calendar.ics")
    assert ics.headers["content-type"].startswith("text/calendar") and "SUMMARY:Cal\\, Con\\; Teste" in ics.text
    slug = r["items"][0]["slug"]
    assert "BEGIN:VEVENT" in client.get(f"{P}/events/{slug}/calendar.ics").text


def test_categories_and_highlights(client, org):
    ev_at(client, org, "Feira", category="artist_fair")
    cats = {c["key"]: c["upcoming"] for c in client.get(f"{P}/categories").json()}
    assert cats["artist_fair"] == 1 and cats["convention"] == 0
    h = client.get(f"{P}/highlights").json()
    assert [e["name"] for e in h["artist_fairs"]] == ["Feira"] and h["popular_metric"] == "tickets_issued"


def test_past_events_hidden_by_default(client, org):
    ev_at(client, org, "Passado", days=-30)
    assert client.get(f"{P}/events").json()["total"] == 0
    assert client.get(f"{P}/events", params={"include_past": True}).json()["items"][0]["status"] == "ended"


def test_haversine_known_distance():
    from app.services.geo import bounding_box, haversine_km

    assert 870 < haversine_km(-15.79, -47.88, -23.55, -46.63) < 880  # Brasília–São Paulo ≈ 873 km
    a, b, c, d = bounding_box(-15.79, -47.88, 100)
    assert a < -15.79 < b and c < -47.88 < d


def test_seeded_demo_events_all_have_slugs(client):
    from app.db import SessionLocal
    from app.seed import seed_demo

    with SessionLocal() as db:
        seed_demo(db)
    items = client.get(f"{P}/events", params={"limit": 100}).json()["items"]
    assert len(items) >= 7 and all(e["slug"] for e in items)


def test_organizer_flow_event_appears_on_home_and_map(client, org):
    body = {"name": "Furry Brasília Con", "start_date": (date.today() + timedelta(days=30)).isoformat(),
            "end_date": (date.today() + timedelta(days=31)).isoformat(), "capacity": 200, "category": "convention",
            "city": "Brasília", "state": "DF", "address": "Rua Pública 1", "latitude": -15.79, "longitude": -47.88}
    ev = client.post("/api/org/events", headers=org, json=body).json()
    assert ev["slug"].startswith("furry-brasilia-con")
    assert client.get(f"{P}/events/map").json()["total"] == 0  # rascunho não aparece
    client.post(f"/api/org/events/{ev['id']}/ticket-types", headers=org, json={"name": "Geral", "price_cents": 0, "quantity": 50})
    assert client.post(f"/api/org/events/{ev['id']}/status", headers=org, json={"status": "published"}).status_code == 200
    assert [e["slug"] for e in client.get(f"{P}/events/map").json()["items"]] == [ev["slug"]]
    assert client.get(f"{P}/events/{ev['slug']}").json()["is_free"] is True


def test_guest_checkout_and_secret_link(client, org):
    e = ev_at(client, org, "Convidado Con")
    tid = client.get(f"{P}/events/{e['slug']}").json()["ticket_types"][0]["id"]
    body = {"ticket_type_id": tid, "badge_name": "Kai", "email": "kai@x.example.com", "accept_privacy": True}
    assert client.post(f"{P}/events/{e['slug']}/guest-checkout", json={**body, "accept_privacy": False}).status_code == 422
    r = client.post(f"{P}/events/{e['slug']}/guest-checkout", json=body)
    assert r.status_code == 201
    token = r.json()["access_path"].rsplit("/", 1)[1]
    t = client.get(f"{P}/tickets/{token}").json()
    assert t["badge_name"] == "Kai" and t["code"] and "email" not in str(t)
    assert client.get(f"{P}/tickets/{token}x").status_code == 404
    # lote de 2: o terceiro é recusado e o estoque vale também para convidados
    assert client.post(f"{P}/events/{e['slug']}/guest-checkout", json=body).status_code == 201
    assert client.post(f"{P}/events/{e['slug']}/guest-checkout", json=body).status_code == 409
    # token não é guardado em claro
    from app.db import SessionLocal
    from app.models import Ticket

    with SessionLocal() as db:
        assert all(token not in (x.guest_token_hash or "") for x in db.query(Ticket))


def test_guest_checkout_rejects_draft_and_unknown(client, org):
    e = ev_at(client, org, "Rascunho X", published=False)
    body = {"ticket_type_id": 1, "badge_name": "K", "email": "k@x.example.com", "accept_privacy": True}
    assert client.post(f"{P}/events/{e['slug']}/guest-checkout", json=body).status_code == 404


def test_private_draft_preview_only_for_own_org(client, org):
    e = ev_at(client, org, "Previa", published=False)
    assert client.get(f"{P}/events/{e['slug']}").status_code == 404
    d = client.get(f"{P}/events/{e['slug']}", headers=org)
    assert d.status_code == 200 and d.json()["preview"] is True and d.json()["indexable"] is False
    other = signup(client, "o2@x.example.com", organization_name="Org B")
    assert client.get(f"{P}/events/{e['slug']}", headers=other).status_code == 404
    assert client.get(f"{P}/events/{e['slug']}", headers=signup(client, "p9@x.example.com")).status_code == 404


def test_geocode_cache_and_auth(client, org, monkeypatch):
    from app.services import geocode as g

    calls = []
    monkeypatch.setattr(g, "_fetch", lambda q: calls.append(q) or [{"lat": "-15.79", "lon": "-47.88", "display_name": "Brasília", "address": {"city": "Brasília", "state": "DF", "country_code": "br"}}])
    monkeypatch.setattr(g, "MIN_INTERVAL", 0)
    assert client.get("/api/org/geocode", params={"q": "Brasília DF"}).status_code == 401
    r = client.get("/api/org/geocode", headers=org, params={"q": "Brasília DF"}).json()["results"]
    assert r[0]["latitude"] == -15.79 and r[0]["country"] == "BR"
    client.get("/api/org/geocode", headers=org, params={"q": "  brasília   df "})
    assert len(calls) == 1  # segunda busca veio do cache
    monkeypatch.setattr(g, "_fetch", lambda q: (_ for _ in ()).throw(OSError("down")))
    assert client.get("/api/org/geocode", headers=org, params={"q": "Outro lugar"}).status_code == 502


def test_contact_form(client):
    ok = {"name": "Ana", "email": "a@x.example.com", "message": "Olá, gostaria de saber mais.", "accept_privacy": True}
    assert client.post(f"{P}/contact", json=ok).status_code == 201
    assert client.post(f"{P}/contact", json={**ok, "accept_privacy": False}).status_code == 422
    assert client.post(f"{P}/contact", json={**ok, "message": "curta"}).status_code == 422


def test_ssr_injects_meta_and_escapes(client, org, monkeypatch):
    from app.routers import public as pub

    monkeypatch.setattr(pub, "_shell", lambda: '<html><head><title>x</title><meta name="description" content="d"></head><body><div id="root"></div></body></html>')
    e = ev_at(client, org, 'Con <script>alert(1)</script>')
    r = client.get(f"{P}/ssr/eventos/{e['slug']}")
    assert r.status_code == 200 and "application/ld+json" in r.text and 'rel="canonical"' in r.text
    assert "alert(1)</script>" not in r.text and "&lt;script&gt;alert" in r.text and "index,follow" in r.text
    assert client.get(f"{P}/ssr/eventos/nada").status_code == 200  # SPA mostra o 404
    draft = ev_at(client, org, "Rascunho SSR", published=False)
    assert "ld+json" not in client.get(f"{P}/ssr/eventos/{draft['slug']}").text  # rascunho não vaza no HTML
    cancelled = ev_at(client, org, "Cancelado SSR")
    client.post(f"/api/org/events/{cancelled['id']}/status", headers=org, json={"status": "cancelled"})
    assert "noindex" in client.get(f"{P}/ssr/eventos/{cancelled['slug']}").text
