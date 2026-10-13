"""Utilitários geográficos: distância aproximada (haversine), caixa delimitadora e slugs."""

import math
import re
import unicodedata

EARTH_KM = 6371.0088


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distância em linha reta sobre a esfera (NÃO é distância rodoviária)."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_KM * math.asin(min(1.0, math.sqrt(a)))


def bounding_box(lat: float, lon: float, radius_km: float) -> tuple[float, float, float, float]:
    """(min_lat, max_lat, min_lon, max_lon) — pré-filtro barato antes do haversine exato.

    Com PostGIS, troque por ST_DWithin sobre uma coluna geography(Point) indexada com GiST.
    """
    dlat = math.degrees(radius_km / EARTH_KM)
    cos = max(math.cos(math.radians(lat)), 1e-6)
    dlon = min(180.0, math.degrees(radius_km / (EARTH_KM * cos)))
    return max(-90.0, lat - dlat), min(90.0, lat + dlat), lon - dlon, lon + dlon


def slugify(text: str) -> str:
    s = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    s = re.sub(r"\[demo\]", "", s, flags=re.I)
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s[:120] or "evento"


def unique_slug(db, model, base: str, year: int | None = None) -> str:
    from sqlalchemy import select

    root = slugify(base)
    if year and str(year) not in root:
        root = f"{root}-{year}"
    slug, n = root, 2
    while db.scalar(select(model.id).where(model.slug == slug)):
        slug = f"{root}-{n}"
        n += 1
    return slug
