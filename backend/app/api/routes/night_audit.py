"""Router del Night Audit: tancament de caixa diari.

Endpoints:
- `POST /night-audit/run`  — llança el tancament per a un property (idempotent).
- `GET  /night-audit`      — llista els tancaments d'un property.
- `GET  /night-audit/{id}` — detall d'un tancament.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import date

from ...database import get_db
from ...models.models import NightAudit, User
from ...schemas.schemas import NightAuditOut, NightAuditRunRequest
from ...services.night_audit_service import run_night_audit
from ...services.security import require_roles

router = APIRouter()


@router.post("/run", response_model=NightAuditOut)
def run_audit(
    payload: NightAuditRunRequest,
    db: Session = Depends(get_db),
    current: User = Depends(require_roles("owner", "admin", "manager", "reception")),
):
    """Llança el tancament de caixa per a un property i una data (idempotent)."""
    try:
        audit = run_night_audit(
            db=db,
            property_id=payload.property_id,
            audit_date=payload.audit_date,
            created_by_id=current.id,
        )
        return audit
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Night audit fallit: {exc}")


@router.get("", response_model=List[NightAuditOut])
def list_audits(
    propertyId: Optional[UUID] = None,
    audit_date: Optional[date] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("owner", "admin", "manager", "reception", "accounting")),
):
    """Llista els tancaments de caixa (filtrable per property i data)."""
    query = db.query(NightAudit)
    if propertyId:
        query = query.filter(NightAudit.property_id == propertyId)
    if audit_date:
        query = query.filter(NightAudit.audit_date == audit_date)
    return query.order_by(NightAudit.audit_date.desc()).all()


@router.get("/{audit_id}", response_model=NightAuditOut)
def get_audit(
    audit_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("owner", "admin", "manager", "reception", "accounting")),
):
    """Detall d'un tancament de caixa."""
    audit = db.get(NightAudit, audit_id)
    if audit is None:
        raise HTTPException(status_code=404, detail="Night audit no trobat")
    return audit
