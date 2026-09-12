from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from ...database import get_db
from ...models.models import Guest, User
from ...schemas.schemas import GuestCreate, GuestOut, GuestUpdate
from ...services.security import require_roles

router = APIRouter()

@router.get("", response_model=List[GuestOut])
def list_guests(
    tenant_id: Optional[UUID] = None,
    email: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("owner", "admin", "manager", "reception")),
):
    query = db.query(Guest)
    if tenant_id:
        query = query.filter(Guest.tenant_id == tenant_id)
    if email:
        query = query.filter(Guest.email == email)
    return query.all()

@router.post("", response_model=GuestOut, status_code=status.HTTP_201_CREATED)
def create_guest(payload: GuestCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin", "manager", "reception"))):
    guest = Guest(**payload.model_dump())
    db.add(guest)
    db.commit()
    db.refresh(guest)
    return guest

@router.get("/{guest_id}", response_model=GuestOut)
def get_guest(guest_id: UUID, db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin", "manager", "reception"))):
    guest = db.get(Guest, guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Huésped no encontrado")
    return guest

@router.patch("/{guest_id}", response_model=GuestOut)
def update_guest(guest_id: UUID, payload: GuestUpdate, db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin", "manager", "reception"))):
    guest = db.get(Guest, guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Huésped no encontrado")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(guest, key, value)
    db.commit()
    db.refresh(guest)
    return guest
