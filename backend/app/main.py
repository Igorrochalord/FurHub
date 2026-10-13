import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .config import get_settings
from .db import SessionLocal, engine
from .migrate import ensure_schema
from .routers import auth, org_events, org_ops, portal, public
from .services.slugs import backfill_slugs

log = logging.getLogger("furconhub")
settings = get_settings()


def wait_for_db(retries: int = 30) -> None:
    for i in range(retries):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return
        except Exception as exc:  # noqa: BLE001
            log.warning("Aguardando o banco (%s/%s): %s", i + 1, retries, exc.__class__.__name__)
            time.sleep(2)
    raise RuntimeError("Banco de dados indisponível")


@asynccontextmanager
async def lifespan(_: FastAPI):
    wait_for_db()
    ensure_schema(engine)
    with SessionLocal() as db:
        backfill_slugs(db)
    if settings.seed_demo:
        from .seed import seed_demo

        with SessionLocal() as db:
            seed_demo(db)
    yield


app = FastAPI(
    title="FurCon Hub API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url=None if settings.is_production else "/api/docs",
    redoc_url=None,
    openapi_url=None if settings.is_production else "/api/openapi.json",
)

if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.middleware("http")
async def security_headers(request, call_next):
    resp = await call_next(request)
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("Referrer-Policy", "same-origin")
    resp.headers.setdefault("Cache-Control", "no-store")
    return resp


@app.get("/api/health", tags=["meta"])
def health():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(org_events.router)
app.include_router(org_ops.router)
app.include_router(portal.router)
app.include_router(public.router)
