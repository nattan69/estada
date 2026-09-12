from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from ...database import get_db
from ...models.models import Room, User
from ...schemas.schemas import RoomCreate, RoomOut, RoomUpdate, RoomStatusUpdate
from ...services.security import require_roles

router = APIRouter()

@router.get("", response_model=List[RoomOut])
def list_rooms(db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin", "manager", "reception"))):
    return db.query(Room).all()

@router.post("", response_model=RoomOut, status_code=status.HTTP_201_CREATED)
def create_room(payload: RoomCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin", "manager"))):
    room = Room(**payload.model_dump())
    db.add(room)
    db.commit()
    db.refresh(room)
    return room

@router.get("/{room_id}", response_model=RoomOut)
def get_room(room_id: UUID, db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin", "manager", "reception"))):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Habitación no encontrada")
    return room

@router.patch("/{room_id}", response_model=RoomOut)
def update_room(room_id: UUID, payload: RoomUpdate, db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin", "manager"))):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Habitación no encontrada")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(room, key, value)
    db.commit()
    db.refresh(room)
    return room

@router.patch("/{room_id}/status", response_model=RoomOut)
def update_room_status(room_id: UUID, payload: RoomStatusUpdate, db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin", "manager", "housekeeping"))):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Habitación no encontrada")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(room, key, value)
    db.commit()
    db.refresh(room)
    return room

@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room(room_id: UUID, db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin"))):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Habitación no encontrada")
    if room.reservations or room.tasks or room.maintenance_tasks:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar: la habitación tiene reservas, tareas o partes de mantenimiento asociados. Desactívala con active=false.",
        )
    db.delete(room)
    db.commit()
    return None
