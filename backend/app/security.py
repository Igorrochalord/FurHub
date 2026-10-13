import base64
import hashlib
import time
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from fastapi import HTTPException

from .config import get_settings


def _prep(password: str) -> bytes:
    # pre-hash: bcrypt only reads 72 bytes and newer versions reject longer input
    return base64.b64encode(hashlib.sha256(password.encode()).digest())


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_prep(password), bcrypt.gensalt(rounds=12)).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_prep(password), hashed.encode())
    except ValueError:
        return False


def create_token(user_id: int) -> str:
    s = get_settings()
    exp = datetime.now(UTC) + timedelta(minutes=s.access_token_minutes)
    return jwt.encode({"sub": str(user_id), "exp": exp}, s.secret_key, algorithm="HS256")


def decode_token(token: str) -> int | None:
    try:
        data = jwt.decode(token, get_settings().secret_key, algorithms=["HS256"])
        return int(data["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None


# Limite simples de tentativas de login (em memória, por processo).
_FAILS: dict[str, list[float]] = {}
MAX_FAILS, WINDOW = 5, 15 * 60


def check_login_allowed(key: str) -> None:
    now = time.time()
    recent = [t for t in _FAILS.get(key, []) if now - t < WINDOW]
    _FAILS[key] = recent
    if len(recent) >= MAX_FAILS:
        raise HTTPException(429, "Muitas tentativas. Tente novamente em alguns minutos.")


def register_login_failure(key: str) -> None:
    _FAILS.setdefault(key, []).append(time.time())


def clear_login_failures(key: str) -> None:
    _FAILS.pop(key, None)
