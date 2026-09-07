from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from ...database import get_db
from ...models.models import Rate
from ...schemas.schemas import RateBulkUpsert, RateOut, RateEntry

router = APIRouter()

@router.post("/bulk-upsert")
def bulk_upsert_rates(payload: RateBulkUpsert, db: Session = Depends(get_db)):
    upserted = 0
    for entry in payload.rates:
        rate = db.query(Rate).filter(
            Rate.room_type_id == payload.room_type_id,
            Rate.rate_plan_id == payload.rate_plan_id,
            Rate.date == entry.date
        ).first()
        
        if rate:
            rate.price = entry.price
            rate.currency = entry.currency
            rate.closed_to_arrival = entry.closed_to_arrival
            rate.closed_to_departure = entry.closed_to_departure
            rate.stop_sell = entry.stop_sell
        else:
            rate = Rate(
                room_type_id=payload.room_type_id,
                rate_plan_id=payload.rate_plan_id,
                date=entry.date,
                price=entry.price,
                currency=entry.currency,
                closed_to_arrival=entry.closed_to_arrival,
                closed_to_departure=entry.closed_to_departure,
                stop_sell=entry.stop_sell
            )
            db.add(rate)
        
        db.commit()
        upserted += 1
        
    return {"upserted": upserted}

@router.get("", response_model=List[RateOut])
def get_rates(
    roomTypeId: Optional[str] = None,
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    ratePlanId: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Rate)
    if roomTypeId:
        query = query.filter(Rate.room_type_id == roomTypeId)
    if ratePlanId:
        query = query.filter(Rate.rate_plan_id == ratePlanId)
    if from_date:
        query = query.filter(Rate.date >= from_date)
    if to_date:
        query = query.filter(Rate.date <= to_date)
        
    return query.all()
