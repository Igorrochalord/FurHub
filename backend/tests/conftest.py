import os
import tempfile

# Banco de testes: Postgres no CI (TEST_DATABASE_URL) ou SQLite local.
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL") or f"sqlite:///{tempfile.mkdtemp()}/test.db"
os.environ["SEED_DEMO"] = "false"
os.environ["ENVIRONMENT"] = "test"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db import engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Base  # noqa: E402
from app.security import _FAILS  # noqa: E402


@pytest.fixture()
def client():
    from sqlalchemy import text

    from app.routers import public

    Base.metadata.drop_all(engine)
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
    public._POSTGIS.clear()
    Base.metadata.create_all(engine)
    _FAILS.clear()
    with TestClient(app) as c:
        yield c


def signup(client, email, role="participant", **extra):
    payload = {"name": "Pessoa Teste", "email": email, "password": "senha-segura-1", "accept_privacy": True, "role": role, **extra}
    path = "/api/auth/register-organizer" if "organization_name" in extra else "/api/auth/register"
    r = client.post(path, json=payload)
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture()
def org(client):
    return signup(client, "admin@a.example.com", organization_name="Org A")


def make_event(client, headers, published=True, capacity=100, **kw):
    r = client.post(
        "/api/org/events",
        headers=headers,
        json={"name": "Con", "start_date": "2026-12-01", "end_date": "2026-12-02", "capacity": capacity, "budget_cents": 100000,
              "city": "Brasília", "state": "DF", "latitude": -15.79, "longitude": -47.88, **kw},
    )
    assert r.status_code == 201, r.text
    ev = r.json()
    r = client.post(
        f"/api/org/events/{ev['id']}/ticket-types",
        headers=headers,
        json={"name": "Geral", "price_cents": 10000, "quantity": 2},
    )
    assert r.status_code == 201, r.text
    if published:
        assert client.post(f"/api/org/events/{ev['id']}/status", headers=headers, json={"status": "published"}).status_code == 200
    return ev, r.json()
