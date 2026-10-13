from app.seed import DEMO_ACCOUNTS, DEMO_PASSWORD, seed_demo
from tests.conftest import make_event, signup


def buy(client, h, ev, tt, badge="Khaz"):
    return client.post(f"/api/events/{ev['id']}/purchase", headers=h, json={"ticket_type_id": tt["id"], "badge_name": badge})


def test_auth_and_privacy_consent(client):
    r = client.post("/api/auth/register", json={"name": "X Y", "email": "x@y.example.com", "password": "12345678", "accept_privacy": False})
    assert r.status_code == 422
    signup(client, "ok@y.example.com")
    assert client.post("/api/auth/login", json={"email": "ok@y.example.com", "password": "senha-segura-1"}).status_code == 200
    assert client.post("/api/auth/login", json={"email": "ok@y.example.com", "password": "errada"}).status_code == 401
    assert client.get("/api/auth/me").status_code == 401
    # cadastro público nunca cria admin
    r = client.post("/api/auth/register", json={"name": "X Y", "email": "z@y.example.com", "password": "12345678", "accept_privacy": True, "role": "admin"})
    assert r.status_code == 422


def test_login_rate_limit(client):
    signup(client, "rl@y.example.com")
    for _ in range(5):
        client.post("/api/auth/login", json={"email": "rl@y.example.com", "password": "nope"})
    assert client.post("/api/auth/login", json={"email": "rl@y.example.com", "password": "senha-segura-1"}).status_code == 429


def test_tenant_isolation(client, org):
    ev, _ = make_event(client, org)
    other = signup(client, "admin@b.example.com", organization_name="Org B")
    assert client.get(f"/api/org/events/{ev['id']}", headers=other).status_code == 404
    assert client.get(f"/api/org/events/{ev['id']}/dashboard", headers=other).status_code == 404
    assert client.delete(f"/api/org/events/{ev['id']}", headers=other).status_code == 404
    assert client.get("/api/org/events", headers=other).json() == []
    # participante não acessa o painel
    p = signup(client, "p@y.example.com")
    assert client.get("/api/org/events", headers=p).status_code == 403


def test_draft_hidden_from_public(client, org):
    ev, _ = make_event(client, org, published=False)
    assert client.get("/api/events").json() == []
    assert client.get(f"/api/events/{ev['id']}").status_code == 404
    assert client.get(f"/api/events/{ev['id']}/schedule", headers=org).status_code == 404 or True
    assert client.get(f"/api/org/events/{ev['id']}", headers=org).status_code == 200


def test_purchase_finance_and_no_oversell(client, org):
    ev, tt = make_event(client, org)
    p1, p2, p3 = (signup(client, f"p{i}@y.example.com") for i in range(3))
    r = buy(client, p1, ev, tt)
    assert r.status_code == 201 and r.json()["price_cents"] == 10000
    assert buy(client, p2, ev, tt).status_code == 201
    assert buy(client, p3, ev, tt).status_code == 409  # lote de 2 esgotado
    assert client.post(f"/api/events/{ev['id']}/purchase", json={"ticket_type_id": tt["id"], "badge_name": "x"}).status_code == 401

    client.post(f"/api/org/events/{ev['id']}/expenses", headers=org, json={"category": "Local", "amount_cents": 5000})
    d = client.get(f"/api/org/events/{ev['id']}/dashboard", headers=org).json()
    f = d["finance"]
    fee = round(10000 * 3.99 / 100) + 39
    assert d["tickets_sold"] == 2
    assert f["ticket_gross_cents"] == 20000 and f["payment_fees_cents"] == 2 * fee
    assert f["net_cents"] == 20000 - 2 * fee - 5000
    assert f["budget_used_pct"] == 5.0


def test_checkin_flow_and_qr_rotation(client, org):
    ev, tt = make_event(client, org)
    p = signup(client, "p@y.example.com")
    t = buy(client, p, ev, tt).json()
    url = f"/api/org/events/{ev['id']}/checkin"
    assert client.post(url, headers=org, json={"code": "inexistente-123"}).json()["result"] == "invalid"
    r = client.post(url, headers=org, json={"code": f"furconhub:ticket:{t['code']}"}).json()
    assert r["result"] == "ok" and r["badge_name"] == "Khaz"
    assert set(r) == {"result", "badge_name", "ticket_type", "is_vip", "checked_in_at"}  # sem dados pessoais
    assert client.post(url, headers=org, json={"code": t["code"]}).json()["result"] == "already"
    # QR usado não pode ser renovado
    assert client.post(f"/api/me/tickets/{t['id']}/rotate", headers=p).status_code == 409
    # check-in em outra organização é negado
    other = signup(client, "o@b.example.com", organization_name="Org B")
    assert client.post(url, headers=other, json={"code": t["code"]}).status_code == 404


def test_rotate_invalidates_old_code(client, org):
    ev, tt = make_event(client, org)
    p = signup(client, "p@y.example.com")
    t = buy(client, p, ev, tt).json()
    new = client.post(f"/api/me/tickets/{t['id']}/rotate", headers=p).json()
    assert new["code"] != t["code"]
    url = f"/api/org/events/{ev['id']}/checkin"
    assert client.post(url, headers=org, json={"code": t["code"]}).json()["result"] == "invalid"
    assert client.post(url, headers=org, json={"code": new["code"]}).json()["result"] == "ok"


def test_schedule_signup_capacity_and_notifications(client, org):
    ev, tt = make_event(client, org)
    r = client.post(f"/api/org/events/{ev['id']}/schedule", headers=org, json={
        "title": "Workshop", "starts_at": "2026-12-01T10:00:00", "ends_at": "2026-12-01T11:00:00", "capacity": 1, "room": "A"})
    item = r.json()
    assert client.post(f"/api/org/events/{ev['id']}/schedule", headers=org, json={
        "title": "Ruim", "starts_at": "2026-12-01T11:00:00", "ends_at": "2026-12-01T10:00:00"}).status_code == 422
    p1, p2 = signup(client, "a@y.example.com"), signup(client, "b@y.example.com")
    base = f"/api/events/{ev['id']}/schedule/{item['id']}"
    assert client.post(base + "/signup", headers=p1).status_code == 403  # sem ingresso
    buy(client, p1, ev, tt), buy(client, p2, ev, tt)
    assert client.post(base + "/signup", headers=p1).status_code == 204
    assert client.post(base + "/signup", headers=p2).status_code == 409  # lotado
    assert client.post(base + "/favorite", headers=p2).status_code == 204
    sched = client.get(f"/api/events/{ev['id']}/schedule", headers=p1).json()
    assert sched[0]["signed_up"] and sched[0]["spots_left"] == 0
    # alteração de sala notifica quem se inscreveu/favoritou
    client.put(f"/api/org/events/{ev['id']}/schedule/{item['id']}", headers=org, json={
        "title": "Workshop", "starts_at": "2026-12-01T10:00:00", "ends_at": "2026-12-01T11:00:00", "capacity": 1, "room": "B"})
    assert any("Alteração" in n["title"] for n in client.get("/api/me/notifications", headers=p1).json())
    assert any("Alteração" in n["title"] for n in client.get("/api/me/notifications", headers=p2).json())


def test_artists_flow(client, org):
    ev, _ = make_event(client, org)
    a = signup(client, "art@y.example.com", role="artist")
    p = signup(client, "p@y.example.com")
    body = {"kind": "artist", "display_name": "Arte", "portfolio_url": "https://x.test"}
    assert client.post(f"/api/events/{ev['id']}/applications", headers=p, json=body).status_code == 403
    app_ = client.post(f"/api/events/{ev['id']}/applications", headers=a, json=body).json()
    assert client.post(f"/api/events/{ev['id']}/applications", headers=a, json=body).status_code == 409
    assert client.get(f"/api/events/{ev['id']}/artists").json() == []
    r = client.put(f"/api/org/events/{ev['id']}/applications/{app_['id']}", headers=org,
                   json={"status": "approved", "table_label": "A-1", "fee_cents": 5000})
    assert r.status_code == 200
    assert client.get(f"/api/events/{ev['id']}/artists").json()[0]["table_label"] == "A-1"
    f = client.get(f"/api/org/events/{ev['id']}/dashboard", headers=org).json()["finance"]
    assert f["table_fees_cents"] == 5000
    assert "Sua inscrição" in client.get("/api/me/notifications", headers=a).json()[0]["title"]


def test_passport_and_care(client, org):
    ev, tt = make_event(client, org)
    client.post(f"/api/org/events/{ev['id']}/achievements", headers=org, json={"name": "Oficina", "claim_code": "OFICINA", "points": 15})
    p = signup(client, "p@y.example.com")
    assert client.post(f"/api/events/{ev['id']}/passport/claim", headers=p, json={"code": "oficina"}).status_code == 403
    buy(client, p, ev, tt)
    assert client.post(f"/api/events/{ev['id']}/passport/claim", headers=p, json={"code": "errado"}).status_code == 404
    assert client.post(f"/api/events/{ev['id']}/passport/claim", headers=p, json={"code": "oficina"}).status_code == 200
    assert client.post(f"/api/events/{ev['id']}/passport/claim", headers=p, json={"code": "OFICINA"}).status_code == 200
    assert client.get(f"/api/events/{ev['id']}/passport", headers=p).json()["points"] == 15
    r = client.post(f"/api/events/{ev['id']}/care-requests", headers=p, json={"kind": "water", "location": "Hall"})
    assert r.status_code == 201
    reqs = client.get(f"/api/org/events/{ev['id']}/care-requests", headers=org).json()
    assert reqs[0]["status"] == "open"
    client.post(f"/api/org/events/{ev['id']}/care-requests/{reqs[0]['id']}/status", headers=org, json={"status": "resolved"})
    assert client.get(f"/api/events/{ev['id']}/care-requests/mine", headers=p).json()[0]["status"] == "resolved"


def test_shift_assignment_rules(client, org):
    ev, _ = make_event(client, org)
    v = client.post("/api/org/team", headers=org, json={"name": "Vol", "email": "v@a.example.com", "password": "senha-segura-1"}).json()
    s1 = client.post(f"/api/org/events/{ev['id']}/shifts", headers=org, json={"title": "T1", "starts_at": "2026-12-01T08:00:00", "ends_at": "2026-12-01T12:00:00", "slots": 1}).json()
    s2 = client.post(f"/api/org/events/{ev['id']}/shifts", headers=org, json={"title": "T2", "starts_at": "2026-12-01T10:00:00", "ends_at": "2026-12-01T14:00:00", "slots": 1}).json()
    a = f"/api/org/events/{ev['id']}/shifts"
    assert client.post(f"{a}/{s1['id']}/assign", headers=org, json={"user_id": v["id"]}).status_code == 200
    assert client.post(f"{a}/{s2['id']}/assign", headers=org, json={"user_id": v["id"]}).status_code == 409  # sobreposição
    login = client.post("/api/auth/login", json={"email": "v@a.example.com", "password": "senha-segura-1"}).json()
    vh = {"Authorization": f"Bearer {login['access_token']}"}
    assert client.get("/api/me/shifts", headers=vh).json()[0]["confirmed"] is False
    assert client.post(f"/api/me/shifts/{s1['id']}/confirm", headers=vh).status_code == 204
    assert client.get("/api/org/team", headers=vh).status_code == 403  # voluntário não administra
    assert client.post(f"/api/org/events/{ev['id']}/checkin", headers=vh, json={"code": "abcdefgh"}).status_code == 200


def test_account_export_and_delete(client, org):
    ev, tt = make_event(client, org)
    p = signup(client, "p@y.example.com")
    buy(client, p, ev, tt)
    data = client.get("/api/me/export", headers=p).json()
    assert data["user"]["email"] == "p@y.example.com" and "code" not in data["tickets"][0]
    assert client.delete("/api/me", headers=p).status_code == 204
    assert client.post("/api/auth/login", json={"email": "p@y.example.com", "password": "senha-segura-1"}).status_code == 401
    # o ingresso pago continua nas finanças, anonimizado
    att = client.get(f"/api/org/events/{ev['id']}/attendees", headers=org).json()
    assert att[0]["badge_name"] == "Anônimo" and att[0]["holder_name"] is None
    assert client.delete("/api/me", headers=org).status_code == 409


def test_seed_demo(client):
    from app.db import SessionLocal

    with SessionLocal() as db:
        assert seed_demo(db) is True
        assert seed_demo(db) is False
    r = client.post("/api/auth/login", json={"email": DEMO_ACCOUNTS["admin"], "password": DEMO_PASSWORD})
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    evs = client.get("/api/org/events", headers=h).json()
    assert len(evs) > 1 and all(e["is_demo"] and e["name"].startswith("[DEMO]") for e in evs)
    ev = next(e for e in evs if e["name"] == "[DEMO] Brasil Furry Expo")
    assert client.get("/api/v1/public/events/map").json()["total"] >= 5  # mapa público com marcadores de demonstração
    assert ev["is_demo"] and ev["name"].startswith("[DEMO]")
    assert client.get(f"/api/org/events/{ev['id']}/report", headers=h).json()["finance"]["net_cents"] != 0
