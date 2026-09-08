"""Seguretat: hashing de contrasenyes i emissió/validació de JWT.

Reemplaça l'auth de mentida (`dummy-token`) per un flux real:
- bcrypt per a les contrasenyes (mai en clar).
- JWT d'accés (curt) + JWT de refresc (llarg).
- Dependències FastAPI per protegir endpoints per rol.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models.models import User

# Esquema Bearer per extreure el token de l'header Authorization.
_bearer = HTTPBearer(auto_error=False)


# ------------------------------------------------------------
# Hashing de contrasenyes
# ------------------------------------------------------------
def hash_password(password: str) -> str:
    """Retorna el hash bcrypt de la contrasenya (mai en clar)."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Comprova una contrasenya contra el seu hash bcrypt."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# ------------------------------------------------------------
# JWT
# ------------------------------------------------------------
def _create_token(subject: str, token_type: str, expires_delta: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,          # id de l'usuari (UUID)
        "type": token_type,      # "access" | "refresh"
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user: User) -> str:
    return _create_token(
        str(user.id),
        "access",
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(user: User) -> str:
    return _create_token(
        str(user.id),
        "refresh",
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_token(token: str) -> dict:
    """Valida i retorna el payload del JWT. Llança HTTPException si no és vàlid."""
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expirat")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invàlid")


# ------------------------------------------------------------
# Dependències d'autenticació
# ------------------------------------------------------------
def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Resol l'usuari autenticat a partir del JWT d'accés."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticació requerida",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token d'accés requerit")

    try:
        user_id = UUID(payload.get("sub"))
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invàlid")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuari no trobat")
    if not user.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuari desactivat")
    return user


def require_roles(*roles: str):
    """Dependència que exigeix un dels rols indicats."""
    def _check(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rol insuficient (cal {', '.join(roles)})",
            )
        return user

    return _check
