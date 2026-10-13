from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .db import get_db
from .models import Event, User
from .security import decode_token

bearer = HTTPBearer(auto_error=False)


def optional_user(
    cred: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)
) -> User | None:
    if not cred:
        return None
    uid = decode_token(cred.credentials)
    user = db.get(User, uid) if uid else None
    return user if user and user.is_active else None


def current_user(user: User | None = Depends(optional_user)) -> User:
    if not user:
        raise HTTPException(401, "Não autenticado", headers={"WWW-Authenticate": "Bearer"})
    return user


def require_roles(*roles: str):
    def dep(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(403, "Sem permissão para esta ação")
        return user

    return dep


admin_user = require_roles("admin")
staff_user = require_roles("admin", "volunteer")


def _own_event(event_id: int, user: User, db: Session) -> Event:
    ev = db.get(Event, event_id)
    # 404 (e não 403) para não revelar a existência de eventos de outras organizações
    if not ev or ev.organization_id != user.organization_id:
        raise HTTPException(404, "Evento não encontrado")
    return ev


def admin_event(event_id: int, user: User = Depends(admin_user), db: Session = Depends(get_db)) -> Event:
    return _own_event(event_id, user, db)


def staff_event(event_id: int, user: User = Depends(staff_user), db: Session = Depends(get_db)) -> Event:
    return _own_event(event_id, user, db)


def visible_event(event_id: int, user: User | None = Depends(optional_user), db: Session = Depends(get_db)) -> Event:
    """Evento publicado, ou qualquer evento da própria organização para a equipe."""
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(404, "Evento não encontrado")
    if ev.status == "published":
        return ev
    if user and user.role in ("admin", "volunteer") and user.organization_id == ev.organization_id:
        return ev
    raise HTTPException(404, "Evento não encontrado")
