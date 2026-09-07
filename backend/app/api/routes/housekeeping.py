from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from ...database import get_db
from ...models.models import HousekeepingTask
from ...schemas.schemas import (
    HousekeepingTaskOut, 
    HousekeepingTaskCreate, 
    HousekeepingTaskUpdate
)

router = APIRouter()

@router.get("", response_model=List[HousekeepingTaskOut])
def list_tasks(
    propertyId: Optional[UUID] = None, 
    status: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    query = db.query(HousekeepingTask)
    if propertyId:
        query = query.filter(HousekeepingTask.property_id == propertyId)
    if status:
        query = query.filter(HousekeepingTask.status == status)
    return query.all()

@router.post("", response_model=HousekeepingTaskOut, status_code=status.HTTP_201_CREATED)
def create_task(payload: HousekeepingTaskCreate, db: Session = Depends(get_db)):
    task = HousekeepingTask(**payload.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.patch("/{task_id}", response_model=HousekeepingTaskOut)
def update_task(task_id: UUID, payload: HousekeepingTaskUpdate, db: Session = Depends(get_db)):
    task = db.get(HousekeepingTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tasca no encontrada")
    
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, key, value)
    
    db.commit()
    db.refresh(task)
    return task

@router.post("/{task_id}/complete")
def complete_task(task_id: UUID, db: Session = Depends(get_db)):
    task = db.get(HousekeepingTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tasca no encontrada")
    
    task.status = "completed"
    task.completed_at = datetime.now()
    db.commit()
    db.refresh(task)
    return task
