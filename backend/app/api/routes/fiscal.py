from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import date, datetime

from ...database import get_db
from ...models.models import FiscalRecord
from ...schemas.schemas import FiscalRecordOut
from ...services import fiscal_service

router = APIRouter()

@router.get("/records", response_model=List[FiscalRecordOut])
def list_fiscal_records(
    propertyId: Optional[UUID] = None, 
    from_date: Optional[date] = Query(None, alias="from"), 
    to_date: Optional[date] = Query(None, alias="to"), 
    db: Session = Depends(get_db)
):
    query = db.query(FiscalRecord)
    if propertyId:
        query = query.filter(FiscalRecord.property_id == propertyId)
    if from_date:
        query = query.filter(FiscalRecord.issued_at >= from_date)
    if to_date:
        query = query.filter(FiscalRecord.issued_at <= to_date)
    return query.all()

@router.get("/records/{record_id}", response_model=FiscalRecordOut)
def get_fiscal_record(record_id: UUID, db: Session = Depends(get_db)):
    record = db.get(FiscalRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Registre fiscal no trobat")
    return record

@router.get("/chain/verify")
def verify_fiscal_chain(propertyId: UUID, db: Session = Depends(get_db)):
    return fiscal_service.verify_chain(db, propertyId)
