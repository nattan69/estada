from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from ...database import get_db
from ...models.models import MaintenanceTask, Room, RoomStatus, User
from ...schemas.schemas import (
    MaintenanceTaskOut,
    MaintenanceTaskCreate,
    MaintenanceTaskUpdate,
)
from ...services.security import require_roles

router = APIRouter()

# Estados que mantienen la habitación bloqueada (no resueltos)
_UNRESOLVED = {"pendent", "en_curs", "en_espera_peca"}


def _sync_room_status(db: Session, task: MaintenanceTask):
    """Bloquea o desbloquea la habitación según queden partes no resueltos."""
    room = db.get(Room, task.room_id)
    if not room:
        return
    open_tasks = (
        db.query(MaintenanceTask)
        .filter(
            MaintenanceTask.room_id == task.room_id,
            MaintenanceTask.status.in_(_UNRESOLVED),
        )
        .count()
    )
    if open_tasks > 0:
        room.status = RoomStatus.OUT_OF_SERVICE.value
    else:
        # Solo desbloquea si estaba fuera de servicio por mantenimiento
        if room.status == RoomStatus.OUT_OF_SERVICE.value:
            room.status = RoomStatus.DIRTY.value
    db.add(room)


@router.get("", response_model=List[MaintenanceTaskOut])
def list_tasks(
    propertyId: Optional[UUID] = None,
    roomId: Optional[UUID] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("owner", "admin", "manager", "reception")),
):
    query = db.query(MaintenanceTask)
    if propertyId:
        query = query.filter(MaintenanceTask.property_id == propertyId)
    if roomId:
        query = query.filter(MaintenanceTask.room_id == roomId)
    if status:
        query = query.filter(MaintenanceTask.status == status)
    return query.order_by(MaintenanceTask.created_at.desc()).all()


@router.post("", response_model=MaintenanceTaskOut, status_code=status.HTTP_201_CREATED)
def create_task(payload: MaintenanceTaskCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin", "manager", "reception"))):
    task = MaintenanceTask(**payload.model_dump())
    db.add(task)
    db.flush()
    _sync_room_status(db, task)
    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}", response_model=MaintenanceTaskOut)
def update_task(task_id: UUID, payload: MaintenanceTaskUpdate, db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin", "manager", "reception"))):
    task = db.get(MaintenanceTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Part de manteniment no trobat")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, key, value)

    # Si pasa a resuelto/cancelado, registrar fecha de resolución
    if payload.status in ("resolt", "cancelat") and not task.resolved_at:
        task.resolved_at = datetime.now()

    db.flush()
    _sync_room_status(db, task)
    db.commit()
    db.refresh(task)
    return task


@router.post("/{task_id}/resolve", response_model=MaintenanceTaskOut)
def resolve_task(task_id: UUID, db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin", "manager", "reception"))):
    task = db.get(MaintenanceTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Part de manteniment no trobat")

    task.status = "resolt"
    task.resolved_at = datetime.now()
    db.flush()
    _sync_room_status(db, task)
    db.commit()
    db.refresh(task)
    return task
