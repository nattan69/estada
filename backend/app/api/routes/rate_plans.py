from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from ...database import get_db
from ...models.models import RatePlan
from ...schemas.schemas import RatePlanCreate, RatePlanOut, RatePlanUpdate

router = APIRouter()

@router.get("", response_model=List[RatePlanOut])
def list_rate_plans(db: Session = Depends(get_db)):
    return db.query(RatePlan).all()

@router.post("", response_model=RatePlanOut, status_code=status.HTTP_201_CREATED)
def create_rate_plan(payload: RatePlanCreate, db: Session = Depends(get_db)):
    rp = RatePlan(**payload.model_dump())
    db.add(rp)
    db.commit()
    db.refresh(rp)
    return rp

@router.get("/{rate_plan_id}", response_model=RatePlanOut)
def get_rate_plan(rate_plan_id: UUID, db: Session = Depends(get_db)):
    rp = db.get(RatePlan, rate_plan_id)
    if not rp:
        raise HTTPException(status_code=404, detail="Plan de tarifa no encontrado")
    return rp

@router.patch("/{rate_plan_id}", response_model=RatePlanOut)
def update_rate_plan(rate_plan_id: UUID, payload: RatePlanUpdate, db: Session = Depends(get_db)):
    rp = db.get(RatePlan, rate_plan_id)
    if not rp:
        raise HTTPException(status_code=404, detail="Plan de tarifa no encontrado")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(rp, key, value)
    db.commit()
    db.refresh(rp)
    return rp
