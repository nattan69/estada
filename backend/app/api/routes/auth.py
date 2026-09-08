from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from ...database import get_db
from ...models.models import User
from ...schemas.schemas import LoginRequest, RefreshRequest, TokenResponse, UserOut
from ...services import security

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Autentica un usuari i retorna access + refresh token."""
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not security.verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credencials incorrectes",
        )
    if not user.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuari desactivat")

    return TokenResponse(
        access_token=security.create_access_token(user),
        refresh_token=security.create_refresh_token(user),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    payload: RefreshRequest,
    db: Session = Depends(get_db),
):
    """Intercanvia un refresh token per un parell nou de tokens."""
    refresh_token = payload.refresh_token

    data = security.decode_token(refresh_token)
    if data.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token de refresc requerit")

    try:
        user_id = UUID(data.get("sub"))
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invàlid")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuari no trobat")
    if not user.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuari desactivat")

    return TokenResponse(
        access_token=security.create_access_token(user),
        refresh_token=security.create_refresh_token(user),
    )


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(security.get_current_user)):
    """Retorna l'usuari autenticat actual."""
    return user
