from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import date

from ...database import get_db
from ...models.models import AgencyContract, ContractAllotment, Reservation
from ...schemas.schemas import (
    AgencyContractCreate,
    AgencyContractOut,
    AgencyContractUpdate,
    ContractAllotmentCreate,
    ContractAllotmentOut,
    ContractAuditResult,
)
from ...services.contract_service import audit_reservation, release_allotments
from ...services.security import require_roles

router = APIRouter()


@router.get("", response_model=List[AgencyContractOut])
def list_contracts(
    propertyId: Optional[UUID] = None,
    db: Session = Depends(get_db),
):
    query = db.query(AgencyContract)
    if propertyId:
        query = query.filter(AgencyContract.property_id == propertyId)
    return query.all()


@router.post("", response_model=AgencyContractOut, status_code=status.HTTP_201_CREATED)
def create_contract(
    payload: AgencyContractCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("owner", "admin", "manager")),
):
    # Comprova que no hi hagi un contracte amb el mateix codi per al property.
    existing = (
        db.query(AgencyContract)
        .filter(
            AgencyContract.property_id == payload.property_id,
            AgencyContract.code == payload.code,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Ja existeix un contracte amb aquest codi")

    allotments = payload.allotments
    contract = AgencyContract(**payload.model_dump(exclude={"allotments"}))
    db.add(contract)
    db.flush()

    for allotment in allotments:
        db.add(
            ContractAllotment(
                contract_id=contract.id,
                **allotment.model_dump(),
            )
        )

    db.commit()
    db.refresh(contract)
    return contract


@router.get("/{contract_id}", response_model=AgencyContractOut)
def get_contract(contract_id: UUID, db: Session = Depends(get_db)):
    contract = db.get(AgencyContract, contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contracte no trobat")
    return contract


@router.patch("/{contract_id}", response_model=AgencyContractOut)
def update_contract(
    contract_id: UUID,
    payload: AgencyContractUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("owner", "admin", "manager")),
):
    contract = db.get(AgencyContract, contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contracte no trobat")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(contract, key, value)
    db.commit()
    db.refresh(contract)
    return contract


@router.delete("/{contract_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contract(
    contract_id: UUID,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("owner", "admin")),
):
    contract = db.get(AgencyContract, contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contracte no trobat")
    db.delete(contract)
    db.commit()
    return None


# ------------------------------------------------------------
# Allotments (cupos)
# ------------------------------------------------------------
@router.post("/{contract_id}/allotments", response_model=ContractAllotmentOut, status_code=status.HTTP_201_CREATED)
def add_allotment(
    contract_id: UUID,
    payload: ContractAllotmentCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("owner", "admin", "manager")),
):
    contract = db.get(AgencyContract, contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contracte no trobat")

    # Idempotència: si ja existeix el cupo per a (contract, room_type, date), l'actualitza.
    existing = (
        db.query(ContractAllotment)
        .filter(
            ContractAllotment.contract_id == contract_id,
            ContractAllotment.room_type_id == payload.room_type_id,
            ContractAllotment.date == payload.date,
        )
        .first()
    )
    if existing:
        for key, value in payload.model_dump().items():
            setattr(existing, key, value)
        db.commit()
        db.refresh(existing)
        return existing

    allotment = ContractAllotment(contract_id=contract_id, **payload.model_dump())
    db.add(allotment)
    db.commit()
    db.refresh(allotment)
    return allotment


# ------------------------------------------------------------
# Auditoria
# ------------------------------------------------------------
@router.post("/audit/{reservation_id}", response_model=ContractAuditResult)
def audit_reservation_endpoint(
    reservation_id: UUID,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("owner", "admin", "manager", "reception")),
):
    reservation = db.get(Reservation, reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no trobada")
    return audit_reservation(db, reservation)


@router.post("/release")
def release_allotments_endpoint(
    property_id: UUID,
    as_of: Optional[date] = None,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("owner", "admin", "manager")),
):
    released = release_allotments(db, property_id, as_of)
    return {"released": released}
