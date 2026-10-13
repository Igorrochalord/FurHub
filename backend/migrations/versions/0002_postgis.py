"""PostGIS: coluna geography gerada + índice GiST (somente PostgreSQL com a extensão disponível)

Revision ID: 0002
Revises: 0001
"""
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    available = bind.exec_driver_sql("SELECT 1 FROM pg_available_extensions WHERE name = 'postgis'").first()
    if not available:
        return  # Postgres sem PostGIS: a busca por raio usa caixa delimitadora + haversine
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute(
        "ALTER TABLE events ADD COLUMN IF NOT EXISTS geog geography(Point,4326) GENERATED ALWAYS AS ("
        "CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL "
        "THEN ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography END) STORED"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_events_geog ON events USING gist (geog)")


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_events_geog")
        op.execute("ALTER TABLE events DROP COLUMN IF EXISTS geog")
