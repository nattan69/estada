from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from ...database import get_db
from ...models.models import RoomType
from ...schemas.schemas import RoomTypeCreate, RoomTypeOut, RoomTypeUpdate

router = APIRouter()

@router.get("", response_model=List[RoomTypeOut])
def list_room_types(db: Session = Depends(get_db)):
    return db.query(RoomType).all()

@router.post("", response_model=RoomTypeOut, status_code=status.HTTP_201_CREATED)
def create_room_type(payload: RoomTypeCreate, db: Session = Depends(get_db)):
    rt = RoomType(**payload.model_dump())
    db.add(rt)
    db.commit()
    db.refresh(rt)
    return rt

@router.get("/{room_type_id}", response_model=RoomTypeOut)
def get_room_type(room_type_id: UUID, db: Session = Depends(get_db)):
    rt = db.get(RoomType, room_type_id)
    if not rt:
        raise HTTPException(status_code=404, detail="Tipo de habitación no encontrado")
    return rt

@router.patch("/{room_type_id}", response_model=RoomTypeOut)
def update_room_type(room_type_id: UUID, payload: RoomTypeUpdate, db: Session = Depends(get_db)):
    rt = db.get(RoomType, room_type_id)
    if not rt:
        raise HTTPException(status_code=404, detail="Tipo de habitación no encontrado")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(rt, key, value)
    db.commit()
    db.refresh(rt)
    return rt
