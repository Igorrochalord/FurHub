"""Geocodificação via Nominatim (OSM) com cache em banco e limite de 1 requisição/s (política de uso do serviço).

Em produção, configure GEOCODER_URL/GEOCODER_USER_AGENT para um provedor contratado.
"""

import json
import threading
import time
import urllib.parse
import urllib.request

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import GeocodeCache

_lock = threading.Lock()
_last = [0.0]
MIN_INTERVAL = 1.1


def _fetch(query: str) -> list[dict]:
    s = get_settings()
    url = f"{s.geocoder_url}?{urllib.parse.urlencode({'q': query, 'format': 'jsonv2', 'limit': 5, 'addressdetails': 1})}"
    req = urllib.request.Request(url, headers={"User-Agent": s.geocoder_user_agent, "Accept-Language": "pt-BR,pt;q=0.9"})
    with urllib.request.urlopen(req, timeout=8) as r:  # noqa: S310 - URL vem da configuração
        return json.loads(r.read().decode())


def _norm(raw: list[dict]) -> list[dict]:
    out = []
    for r in raw:
        a = r.get("address", {})
        out.append({
            "label": r.get("display_name", ""), "latitude": round(float(r["lat"]), 6), "longitude": round(float(r["lon"]), 6),
            "city": a.get("city") or a.get("town") or a.get("village") or a.get("municipality") or "",
            "state": a.get("state", ""), "country": (a.get("country_code") or "").upper(), "district": a.get("suburb") or a.get("neighbourhood") or "",
            "postal_code": a.get("postcode", ""), "address": " ".join(x for x in (a.get("road"), a.get("house_number")) if x),
        })
    return out


def geocode(db: Session, query: str) -> list[dict]:
    q = " ".join(query.lower().split())[:300]
    hit = db.scalar(select(GeocodeCache).where(GeocodeCache.query == q))
    if hit:
        return json.loads(hit.results_json)
    with _lock:  # serializa e espaça as chamadas ao provedor
        wait = MIN_INTERVAL - (time.time() - _last[0])
        if wait > 0:
            time.sleep(wait)
        try:
            raw = _fetch(q)
        finally:
            _last[0] = time.time()
    results = _norm(raw)
    db.add(GeocodeCache(query=q, results_json=json.dumps(results)))
    db.commit()
    return results
