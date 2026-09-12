from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
from datetime import date
from decimal import Decimal

from ...database import get_db
from ...models.models import Reservation, ReservationNight, Folio, FolioItem, Room, User
from ...schemas.schemas import ReservationOut
from ...services.security import require_roles

router = APIRouter()

@router.get("/occupancy")
def get_occupancy(
    propertyId: UUID, 
    from_date: date = Query(..., alias="from"), 
    to_date: date = Query(..., alias="to"), 
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("owner", "admin", "manager", "reception", "accounting")),
):
    # Compta ReservationNight amb status de la reserva != "canceled" entre les dates
    nights_sold = db.query(ReservationNight).join(Reservation).filter(
        Reservation.property_id == propertyId,
        Reservation.status != "canceled",
        ReservationNight.date >= from_date,
        ReservationNight.date <= to_date
    ).count()
    
    # nº habitacions * nº nits
    rooms_count = db.query(Room).filter(Room.property_id == propertyId).count()
    total_nights = (to_date - from_date).days + 1
    available_nights = rooms_count * total_nights
    
    occupancy_pct = (nights_sold / available_nights * 100) if available_nights > 0 else 0.0
    
    return {
        "property_id": propertyId,
        "from": from_date,
        "to": to_date,
        "occupancy_pct": float(occupancy_pct)
    }

@router.get("/revenue")
def get_revenue(
    propertyId: UUID, 
    from_date: date = Query(..., alias="from"), 
    to_date: date = Query(..., alias="to"), 
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("owner", "admin", "manager", "reception", "accounting")),
):
    # Suma FolioItem.amount (type="charge") dels folios de la propietat entre les dates
    revenue = db.query(func.coalesce(func.sum(FolioItem.amount), 0)).join(Folio).filter(
        Folio.property_id == propertyId,
        FolioItem.type == "charge",
        FolioItem.posted_at >= from_date,
        FolioItem.posted_at <= to_date
    ).scalar() or Decimal("0")
    
    return {
        "property_id": propertyId,
        "from": from_date,
        "to": to_date,
        "revenue": revenue
    }

@router.get("/adr")
def get_adr(
    propertyId: UUID, 
    from_date: date = Query(..., alias="from"), 
    to_date: date = Query(..., alias="to"), 
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("owner", "admin", "manager", "reception", "accounting")),
):
    # revenue / nº nits venudes
    revenue_res = get_revenue(propertyId, from_date, to_date, db)
    revenue = revenue_res["revenue"]
    
    nights_sold = db.query(ReservationNight).join(Reservation).filter(
        Reservation.property_id == propertyId,
        Reservation.status != "canceled",
        ReservationNight.date >= from_date,
        ReservationNight.date <= to_date
    ).count()
    
    adr = revenue / nights_sold if nights_sold > 0 else Decimal("0")
    
    return {
        "property_id": propertyId,
        "from": from_date,
        "to": to_date,
        "adr": adr
    }

@router.get("/revpar")
def get_revpar(
    propertyId: UUID, 
    from_date: date = Query(..., alias="from"), 
    to_date: date = Query(..., alias="to"), 
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("owner", "admin", "manager", "reception", "accounting")),
):
    # revenue / (nº habitacions * nº nits)
    revenue_res = get_revenue(propertyId, from_date, to_date, db)
    revenue = revenue_res["revenue"]
    
    rooms_count = db.query(Room).filter(Room.property_id == propertyId).count()
    total_nights = (to_date - from_date).days + 1
    available_nights = rooms_count * total_nights
    
    revpar = revenue / available_nights if available_nights > 0 else Decimal("0")
    
    return {
        "property_id": propertyId,
        "from": from_date,
        "to": to_date,
        "revpar": revpar
    }

@router.get("/front-desk/arrivals", response_model=List[ReservationOut])
def get_arrivals(
    date_param: Optional[date] = Query(None, alias="date"),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("owner", "admin", "manager", "reception")),
):
    target = date_param or date.today()
    return db.query(Reservation).filter(
        Reservation.check_in == target,
        Reservation.status.in_(["confirmed", "checked_in"])
    ).all()

@router.get("/front-desk/departures", response_model=List[ReservationOut])
def get_departures(
    date_param: Optional[date] = Query(None, alias="date"),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("owner", "admin", "manager", "reception")),
):
    target = date_param or date.today()
    return db.query(Reservation).filter(
        Reservation.check_out == target,
        Reservation.status == "checked_in"
    ).all()
