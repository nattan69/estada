from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime
from decimal import Decimal

from ...database import get_db
from ...models.models import Folio, FolioItem, Payment
from ...schemas.schemas import FolioOut, ChargeCreate, DiscountCreate, PaymentCreate, RefundCreate, FolioItemOut, PaymentOut

router = APIRouter()

@router.get("/{folio_id}", response_model=FolioOut)
def get_folio(folio_id: UUID, db: Session = Depends(get_db)):
    folio = db.get(Folio, folio_id)
    if not folio:
        raise HTTPException(status_code=404, detail="Folio no encontrado")
    return folio

@router.post("/{folio_id}/charges", response_model=FolioItemOut)
def add_charge(folio_id: UUID, payload: ChargeCreate, db: Session = Depends(get_db)):
    folio = db.get(Folio, folio_id)
    if not folio:
        raise HTTPException(status_code=404, detail="Folio no encontrado")
    
    amount = Decimal(str(payload.quantity)) * Decimal(str(payload.unit_price))
    item = FolioItem(
        folio_id=folio_id,
        type="charge",
        description=payload.description,
        amount=amount,
        quantity=payload.quantity,
        unit_price=payload.unit_price
    )
    db.add(item)
    
    folio.total_amount = (folio.total_amount or Decimal("0")) + amount
    folio.balance = (folio.total_amount or Decimal("0")) - (folio.paid_amount or Decimal("0"))
    
    db.commit()
    db.refresh(item)
    return item

@router.post("/{folio_id}/discounts", response_model=FolioItemOut)
def add_discount(folio_id: UUID, payload: DiscountCreate, db: Session = Depends(get_db)):
    folio = db.get(Folio, folio_id)
    if not folio:
        raise HTTPException(status_code=404, detail="Folio no encontrado")
    
    amount = -Decimal(str(payload.amount))
    item = FolioItem(
        folio_id=folio_id,
        type="discount",
        description=payload.description,
        quantity=1,
        unit_price=amount,
        amount=amount
    )
    db.add(item)
    
    folio.total_amount = (folio.total_amount or Decimal("0")) + amount
    folio.balance = (folio.total_amount or Decimal("0")) - (folio.paid_amount or Decimal("0"))
    
    db.commit()
    db.refresh(item)
    return item

@router.post("/{folio_id}/payments", response_model=PaymentOut)
def add_payment(folio_id: UUID, payload: PaymentCreate, db: Session = Depends(get_db)):
    folio = db.get(Folio, folio_id)
    if not folio:
        raise HTTPException(status_code=404, detail="Folio no encontrado")
    
    amount = Decimal(str(payload.amount))
    payment = Payment(
        folio_id=folio_id,
        provider=payload.provider,
        method=payload.method,
        amount=amount,
        currency=payload.currency,
        external_ref=payload.external_ref,
        idempotency_key=payload.idempotency_key,
        status="captured",
        captured_at=datetime.now()
    )
    db.add(payment)
    
    folio.paid_amount = (folio.paid_amount or Decimal("0")) + amount
    folio.balance = (folio.total_amount or Decimal("0")) - (folio.paid_amount or Decimal("0"))
    
    db.commit()
    db.refresh(payment)
    return payment

@router.post("/{folio_id}/refunds", response_model=PaymentOut)
def add_refund(folio_id: UUID, payload: RefundCreate, db: Session = Depends(get_db)):
    folio = db.get(Folio, folio_id)
    if not folio:
        raise HTTPException(status_code=404, detail="Folio no encontrado")
    
    amount = -Decimal(str(payload.amount))
    payment = Payment(
        folio_id=folio_id,
        provider="refund",
        amount=amount,
        status="refunded",
        failure_reason=payload.reason,
        refunded_at=datetime.now()
    )
    db.add(payment)
    
    folio.paid_amount = (folio.paid_amount or Decimal("0")) + amount
    folio.balance = (folio.total_amount or Decimal("0")) - (folio.paid_amount or Decimal("0"))
    
    db.commit()
    db.refresh(payment)
    return payment

@router.post("/{folio_id}/close", response_model=FolioOut)
def close_folio(folio_id: UUID, db: Session = Depends(get_db)):
    folio = db.get(Folio, folio_id)
    if not folio:
        raise HTTPException(status_code=404, detail="Folio no encontrado")
    
    if folio.balance != 0:
        raise HTTPException(status_code=400, detail="El folio no tiene saldo cero")
    
    folio.status = "closed"
    folio.closed_at = datetime.now()
    db.commit()
    db.refresh(folio)
    return folio
