from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import current_user
from ..models import Organization, User, utcnow
from ..schemas import LoginIn, OrganizerRegisterIn, PasswordChangeIn, RegisterIn, TokenOut, UserOut
from ..security import (
    check_login_allowed,
    clear_login_failures,
    create_token,
    hash_password,
    register_login_failure,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _email_taken(db: Session, email: str) -> bool:
    return db.scalar(select(User.id).where(User.email == email.lower())) is not None


def _token(user: User) -> TokenOut:
    return TokenOut(access_token=create_token(user.id), user=UserOut.model_validate(user))


@router.post("/register", response_model=TokenOut, status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    if _email_taken(db, body.email):
        raise HTTPException(409, "E-mail já cadastrado")
    user = User(
        email=body.email.lower(),
        name=body.name.strip(),
        role=body.role,
        password_hash=hash_password(body.password),
        privacy_accepted_at=utcnow(),
    )
    db.add(user)
    db.commit()
    return _token(user)


@router.post("/register-organizer", response_model=TokenOut, status_code=201)
def register_organizer(body: OrganizerRegisterIn, db: Session = Depends(get_db)):
    if _email_taken(db, body.email):
        raise HTTPException(409, "E-mail já cadastrado")
    org = Organization(name=body.organization_name.strip())
    db.add(org)
    db.flush()
    user = User(
        email=body.email.lower(),
        name=body.name.strip(),
        role="admin",
        organization_id=org.id,
        password_hash=hash_password(body.password),
        privacy_accepted_at=utcnow(),
    )
    db.add(user)
    db.commit()
    return _token(user)


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, request: Request, db: Session = Depends(get_db)):
    key = f"{request.client.host if request.client else '-'}:{body.email.lower()}"
    check_login_allowed(key)
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if not user or not user.is_active or not verify_password(body.password, user.password_hash):
        register_login_failure(key)
        raise HTTPException(401, "E-mail ou senha inválidos")
    clear_login_failures(key)
    return _token(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user


@router.post("/password", status_code=204)
def change_password(body: PasswordChangeIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(400, "Senha atual incorreta")
    user.password_hash = hash_password(body.new_password)
    db.commit()
