from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from ...database import get_db
from ...models.models import Property
from ...schemas.schemas import PropertyCreate, PropertyOut, PropertyUpdate

router = APIRouter()

@router.get("", response_model=List[PropertyOut])
def list_properties(db: Session = Depends(get_db)):
    return db.query(Property).all()

@router.post("", response_model=PropertyOut, status_code=status.HTTP_201_CREATED)
def create_property(payload: PropertyCreate, db: Session = Depends(get_db)):
    prop = Property(**payload.model_dump())
    db.add(prop)
    db.commit()
    db.refresh(prop)
    return prop

@router.get("/{property_id}", response_model=PropertyOut)
def get_property(property_id: UUID, db: Session = Depends(get_db)):
    prop = db.get(Property, property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")
    return prop

@router.patch("/{property_id}", response_model=PropertyOut)
def update_property(property_id: UUID, payload: PropertyUpdate, db: Session = Depends(get_db)):
    prop = db.get(Property, property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(prop, key, value)
    db.commit()
    db.refresh(prop)
    return prop
