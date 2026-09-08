from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from ...database import get_db
from ...models.models import User
from ...schemas.schemas import UserCreate, UserOut
from ...services import security

router = APIRouter()


@router.get("", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(security.require_roles("owner", "admin", "manager")),
):
    return db.query(User).all()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current: User = Depends(security.require_roles("owner", "admin")),
):
    """Crea un usuari amb la contrasenya hashejada (mai en clar).

    El `tenant_id` es deriva de l'usuari autenticat (mai del payload), per
    evitar que un admin creï usuaris en un altre tenant.
    """
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email ja registrat")

    data = payload.model_dump(exclude={"tenant_id", "password"})
    user = User(
        **data,
        tenant_id=current.tenant_id,
        password_hash=security.hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(security.require_roles("owner", "admin", "manager")),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuari no trobat")
    return user
