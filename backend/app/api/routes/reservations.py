from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import date, datetime, timedelta
from decimal import Decimal

from ...database import get_db
from ...models.models import Reservation, ReservationNight
from ...schemas.schemas import ReservationCreate, ReservationOut, ReservationUpdate

router = APIRouter()

@router.get("", response_model=List[ReservationOut])
def list_reservations(
    propertyId: Optional[UUID] = None,
    date: Optional[date] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Reservation)
    if propertyId:
        query = query.filter(Reservation.property_id == propertyId)
    if status:
        query = query.filter(Reservation.status == status)
    if date:
        query = query.filter(Reservation.check_in <= date, Reservation.check_out >= date)
    return query.all()

@router.post("", response_model=ReservationOut, status_code=status.HTTP_201_CREATED)
def create_reservation(payload: ReservationCreate, db: Session = Depends(get_db)):
    res = Reservation(**payload.model_dump())
    db.add(res)
    db.flush()
    
    # Create reservation nights
    curr_date = res.check_in
    while curr_date < res.check_out:
        night = ReservationNight(
            reservation_id=res.id,
            room_type_id=res.room_type_id,
            rate_plan_id=res.rate_plan_id,
            date=curr_date,
            base_rate=Decimal("0"),
            amount=Decimal("0"),
            taxes=Decimal("0"),
            discounts=Decimal("0")
        )
        db.add(night)
        curr_date += timedelta(days=1)
        
    db.commit()
    db.refresh(res)
    return res

@router.get("/{reservation_id}", response_model=ReservationOut)
def get_reservation(reservation_id: UUID, db: Session = Depends(get_db)):
    res = db.get(Reservation, reservation_id)
    if not res:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return res

@router.patch("/{reservation_id}", response_model=ReservationOut)
def update_reservation(reservation_id: UUID, payload: ReservationUpdate, db: Session = Depends(get_db)):
    res = db.get(Reservation, reservation_id)
    if not res:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(res, key, value)
        
    db.commit()
    db.refresh(res)
    return res

@router.post("/{reservation_id}/cancel")
def cancel_reservation(reservation_id: UUID, db: Session = Depends(get_db)):
    res = db.get(Reservation, reservation_id)
    if not res:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    res.status = "canceled"
    res.canceled_at = datetime.now()
    db.commit()
    return {"message": "Reserva cancelada"}

@router.post("/{reservation_id}/check-in")
def check_in_reservation(reservation_id: UUID, db: Session = Depends(get_db)):
    res = db.get(Reservation, reservation_id)
    if not res:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    res.status = "checked_in"
    db.commit()
    return {"message": "Check-in realizado"}

@router.post("/{reservation_id}/check-out")
def check_out_reservation(reservation_id: UUID, db: Session = Depends(get_db)):
    res = db.get(Reservation, reservation_id)
    if not res:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    res.status = "checked_out"
    db.commit()
    return {"message": "Check-out realizado"}

@router.post("/{reservation_id}/assign-room")
def assign_room(reservation_id: UUID, payload: dict, db: Session = Depends(get_db)):
    res = db.get(Reservation, reservation_id)
    if not res:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    room_id = payload.get("room_id")
    if not room_id:
        raise HTTPException(status_code=400, detail="room_id es requerido")
        
    res.assigned_room_id = UUID(str(room_id))
    db.commit()
    return {"message": "Habitación asignada"}

@router.post("/{reservation_id}/change-room")
def change_room(reservation_id: UUID, payload: dict, db: Session = Depends(get_db)):
    res = db.get(Reservation, reservation_id)
    if not res:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    room_id = payload.get("room_id")
    if not room_id:
        raise HTTPException(status_code=400, detail="room_id es requerido")
        
    res.assigned_room_id = UUID(str(room_id))
    db.commit()
    return {"message": "Habitación cambiada"}
