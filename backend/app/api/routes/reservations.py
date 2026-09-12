from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID, uuid4
from datetime import date, datetime, timedelta
from decimal import Decimal

from ...database import get_db
from ...models.models import Reservation, ReservationNight, Rate, Folio, FolioItem, Room, User, Property, BillingMode, Payment, PaymentType, PaymentStatus, FolioItemType
from ...schemas.schemas import ReservationCreate, ReservationOut, ReservationUpdate, QuoteRequest, QuoteResponse, FolioOut
from ...services.availability_service import search_availability
from ...services.pricing_service import build_reservation_breakdown
from ...services.journal_service import journal_payment, journal_checkin_taxes
from ...services.security import require_roles

router = APIRouter()

@router.post("/quote", response_model=List[QuoteResponse])
def get_quote(payload: QuoteRequest, db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin", "manager", "reception"))):
    try:
        results = search_availability(
            db=db,
            property_id=payload.property_id,
            check_in=payload.check_in,
            check_out=payload.check_out,
            adults=payload.adults,
            children=payload.children,
            rate_plan_id=payload.rate_plan_id
        )
        return results
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("", response_model=List[ReservationOut])
def list_reservations(
    propertyId: Optional[UUID] = None,
    date: Optional[date] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("owner", "admin", "manager", "reception")),
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
def create_reservation(payload: ReservationCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin", "manager", "reception"))):
    res = Reservation(**payload.model_dump())
    if not res.confirmation_code:
        res.confirmation_code = f"CONF-{uuid4().hex[:8].upper()}"
    db.add(res)
    db.flush()
    
    # Create reservation nights with real pricing from the rate card
    total = Decimal("0")
    curr_date = res.check_in
    while curr_date < res.check_out:
        rate_query = db.query(Rate).filter(
            Rate.room_type_id == res.room_type_id,
            Rate.date == curr_date,
        )
        if res.rate_plan_id:
            rate_query = rate_query.filter(Rate.rate_plan_id == res.rate_plan_id)
        rate = rate_query.first()
        base_rate = rate.price if rate else Decimal("0")
        total += base_rate
        night = ReservationNight(
            reservation_id=res.id,
            room_type_id=res.room_type_id,
            rate_plan_id=res.rate_plan_id,
            date=curr_date,
            base_rate=base_rate,
            amount=base_rate,
            taxes=Decimal("0"),
            discounts=Decimal("0")
        )
        db.add(night)
        curr_date += timedelta(days=1)
    
    # Persistir el precio real calculado (no el que venga por defecto a 0)
    if total > 0:
        res.total_amount = total
        
    db.commit()
    db.refresh(res)
    return res

@router.get("/{reservation_id}", response_model=ReservationOut)
def get_reservation(reservation_id: UUID, db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin", "manager", "reception"))):
    res = db.get(Reservation, reservation_id)
    if not res:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return res

@router.get("/{reservation_id}/folio", response_model=FolioOut)
def get_reservation_folio(reservation_id: UUID, db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin", "manager", "reception", "housekeeping"))):
    res = db.get(Reservation, reservation_id)
    if not res:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    if res.folio is None:
        raise HTTPException(status_code=404, detail="La reserva no tiene folio")
    return res.folio

@router.patch("/{reservation_id}", response_model=ReservationOut)
def update_reservation(reservation_id: UUID, payload: ReservationUpdate, db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin", "manager", "reception"))):
    res = db.get(Reservation, reservation_id)
    if not res:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(res, key, value)
        
    db.commit()
    db.refresh(res)
    return res

@router.post("/{reservation_id}/cancel")
def cancel_reservation(reservation_id: UUID, db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin", "manager", "reception"))):
    res = db.get(Reservation, reservation_id)
    if not res:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    res.status = "canceled"
    res.canceled_at = datetime.now()
    db.commit()
    return {"message": "Reserva cancelada"}

@router.post("/{reservation_id}/check-in")
def check_in_reservation(reservation_id: UUID, db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin", "manager", "reception"))):
    res = db.get(Reservation, reservation_id)
    if not res:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    if res.status == "checked_in":
        raise HTTPException(status_code=400, detail="La reserva ya está en check-in")

    # Abrir folio si la reserva aún no tiene.
    folio = res.folio
    if folio is None:
        folio = Folio(
            property_id=res.property_id,
            reservation_id=res.id,
            guest_id=res.guest_id,
            kind="reservation",
            status="open",
            currency=res.currency,
            total_amount=Decimal("0"),
            paid_amount=Decimal("0"),
            balance=Decimal("0"),
        )
        db.add(folio)
        db.flush()

    # Mode de facturació global de la propietat (prepaid/postpaid).
    prop = db.get(Property, res.property_id)
    prepaid = (prop.billing_mode == BillingMode.PREPAID.value) if prop else True

    if prepaid:
        # Factura a l'entrada: es calcula el total (base + IVA per servei +
        # ecotaxa + IVA de l'ecotaxa), es posta l'IVA i l'ecotaxa com a
        # càrrecs (passius) i es cobra tot — política de Tomeu: no entra
        # ningú que no hagi pagat l'estada sencera. El foli queda ACREEDOR
        # (balance negatiu = base pendent de consumir) i el night audit va
        # minvant aquesta bestreta nit a nit fins a zero.
        bd = build_reservation_breakdown(db, res)
        vat_total = bd["vat_room"] + bd["vat_meal"] + bd["vat_ecotaxa"]
        ecotaxa_total = bd["ecotaxa"]
        entry_date = res.check_in or date.today()

        if vat_total > 0:
            db.add(FolioItem(
                folio_id=folio.id,
                type=FolioItemType.TAX.value,
                description="IVA",
                quantity=1,
                unit_price=vat_total,
                tax_rate=Decimal("0"),
                amount=vat_total,
                account_code="vat_payable",
            ))
            folio.total_amount = (folio.total_amount or Decimal("0")) + vat_total

        if ecotaxa_total > 0:
            db.add(FolioItem(
                folio_id=folio.id,
                type=FolioItemType.TAX.value,
                description="Ecotaxa (ITS)",
                quantity=1,
                unit_price=ecotaxa_total,
                tax_rate=Decimal("0"),
                amount=ecotaxa_total,
                account_code="tax_payable",
            ))
            folio.total_amount = (folio.total_amount or Decimal("0")) + ecotaxa_total

        # Cobrament total (bestreta) al check-in.
        total_a_cobrar = bd["total"]
        if total_a_cobrar > 0:
            payment = Payment(
                folio_id=folio.id,
                provider="manual",
                method="cash",  # per defecte; parametritzable en una iteració posterior
                payment_type=PaymentType.ADVANCE.value,
                status=PaymentStatus.CAPTURED.value,
                amount=total_a_cobrar,
                currency=res.currency or "EUR",
                captured_at=datetime.now(),
            )
            db.add(payment)
            folio.paid_amount = (folio.paid_amount or Decimal("0")) + total_a_cobrar

        folio.balance = (folio.total_amount or Decimal("0")) - (folio.paid_amount or Decimal("0"))

        # Assentaments: bestreta rebuda + IVA/ecotaxa facturats a l'entrada.
        journal_payment(
            db,
            property_id=res.property_id,
            folio_id=folio.id,
            amount=total_a_cobrar,
            entry_date=entry_date,
            payment_type=PaymentType.ADVANCE.value,
        )
        journal_checkin_taxes(
            db,
            property_id=res.property_id,
            folio_id=folio.id,
            vat_amount=vat_total,
            ecotaxa_amount=ecotaxa_total,
            entry_date=entry_date,
        )

    res.status = "checked_in"
    db.commit()
    return {"message": "Check-in realizado", "folio_id": str(folio.id)}

@router.post("/{reservation_id}/check-out")
def check_out_reservation(reservation_id: UUID, db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin", "manager", "reception"))):
    res = db.get(Reservation, reservation_id)
    if not res:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    if res.status != "checked_in":
        raise HTTPException(status_code=400, detail="La reserva no está en check-in")
    
    # Cerrar el folio si existe y está saldado
    folio = res.folio
    if folio is not None and folio.status != "closed":
        if (folio.balance or Decimal("0")) != 0:
            raise HTTPException(
                status_code=400,
                detail="El folio tiene saldo pendiente. Liquide la cuenta antes del check-out"
            )
        folio.status = "closed"
        folio.closed_at = datetime.now()
    
    res.status = "checked_out"
    db.commit()
    return {"message": "Check-out realizado"}

@router.post("/{reservation_id}/assign-room")
def assign_room(reservation_id: UUID, payload: dict, db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin", "manager", "reception"))):
    res = db.get(Reservation, reservation_id)
    if not res:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    room_id = payload.get("room_id")
    if not room_id:
        raise HTTPException(status_code=400, detail="room_id es requerido")
    try:
        room_uuid = UUID(str(room_id))
    except (ValueError, AttributeError):
        raise HTTPException(status_code=422, detail="room_id no es un UUID válido")
    room = db.get(Room, room_uuid)
    if not room:
        raise HTTPException(status_code=404, detail="Habitación no encontrada")
        
    res.assigned_room_id = room_uuid
    db.commit()
    return {"message": "Habitación asignada"}

@router.post("/{reservation_id}/change-room")
def change_room(reservation_id: UUID, payload: dict, db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin", "manager", "reception"))):
    res = db.get(Reservation, reservation_id)
    if not res:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    room_id = payload.get("room_id")
    if not room_id:
        raise HTTPException(status_code=400, detail="room_id es requerido")
    try:
        room_uuid = UUID(str(room_id))
    except (ValueError, AttributeError):
        raise HTTPException(status_code=422, detail="room_id no es un UUID válido")
    room = db.get(Room, room_uuid)
    if not room:
        raise HTTPException(status_code=404, detail="Habitación no encontrada")
        
    res.assigned_room_id = room_uuid
    db.commit()
    return {"message": "Habitación cambiada"}
