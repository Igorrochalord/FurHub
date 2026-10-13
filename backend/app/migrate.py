"""Migrações: Alembic (baseline em migrations/versions).

Bancos criados antes do Alembic (via create_all) são completados com colunas/tabelas faltantes e marcados no `head`.
"""

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

from .config import get_settings
from .models import Base


def _config() -> Config:
    cfg = Config()
    cfg.set_main_option("script_location", str(Path(__file__).resolve().parent.parent / "migrations"))
    cfg.attributes["url"] = get_settings().sqlalchemy_url
    return cfg


def _add_missing_columns(engine: Engine) -> None:
    Base.metadata.create_all(engine)  # tabelas novas
    insp = inspect(engine)
    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            have = {c["name"] for c in insp.get_columns(table.name)}
            for col in table.columns:
                if col.name in have:
                    continue
                default = ""
                if col.default is not None and getattr(col.default, "is_scalar", False):
                    v = col.default.arg
                    default = f" DEFAULT {int(v) if isinstance(v, bool) else repr(v) if isinstance(v, str) else v}"
                conn.execute(text(f'ALTER TABLE {table.name} ADD COLUMN "{col.name}" {col.type.compile(engine.dialect)}{default}'))


def ensure_schema(engine: Engine) -> None:
    insp = inspect(engine)
    cfg = _config()
    if not insp.has_table("alembic_version") and insp.has_table("events"):
        _add_missing_columns(engine)  # banco legado
        command.stamp(cfg, "0001")  # esquema equivalente ao baseline; as demais migrações rodam abaixo
        command.upgrade(cfg, "head")
    else:
        command.upgrade(cfg, "head")
