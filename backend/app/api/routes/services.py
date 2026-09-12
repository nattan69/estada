"""Serveis facturables (catàleg de serveis amb el seu IVA).

Cada servei té el seu tipus d'IVA (`vat_rate`) i el compte d'ingrés
(`revenue_account` = AccountCode) al qual es mapeja. És la font de veritat
del tipus impositiu per servei (10% allotjament/restauració, 21% general...).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from ...database import get_db
from ...models.models import Service, User
from ...schemas.schemas import ServiceCreate, ServiceUpdate, ServiceOut
from ...services.security import require_roles

router = APIRouter()


@router.get("", response_model=List[ServiceOut])
def list_services(
    db: Session = Depends(get_db),
    current: User = Depends(require_roles("owner", "admin", "manager", "reception", "accounting")),
):
    return (
        db.query(Service)
        .filter(Service.tenant_id == current.tenant_id, Service.active.is_(True))
        .order_by(Service.category, Service.code)
        .all()
    )


@router.post("", response_model=ServiceOut, status_code=status.HTTP_201_CREATED)
def create_service(
    payload: ServiceCreate,
    db: Session = Depends(get_db),
    current: User = Depends(require_roles("owner", "admin", "manager")),
):
    existing = (
        db.query(Service)
        .filter(Service.tenant_id == current.tenant_id, Service.code == payload.code)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Ya existe un servicio con ese código")
    svc = Service(
        tenant_id=current.tenant_id,
        code=payload.code,
        name=payload.name,
        category=payload.category,
        vat_rate=payload.vat_rate,
        revenue_account=payload.revenue_account,
        active=payload.active,
    )
    db.add(svc)
    db.commit()
    db.refresh(svc)
    return svc


@router.get("/{service_id}", response_model=ServiceOut)
def get_service(
    service_id: UUID,
    db: Session = Depends(get_db),
    current: User = Depends(require_roles("owner", "admin", "manager", "reception", "accounting")),
):
    svc = db.get(Service, service_id)
    if not svc or svc.tenant_id != current.tenant_id:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return svc


@router.patch("/{service_id}", response_model=ServiceOut)
def update_service(
    service_id: UUID,
    payload: ServiceUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(require_roles("owner", "admin", "manager")),
):
    svc = db.get(Service, service_id)
    if not svc or svc.tenant_id != current.tenant_id:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(svc, key, value)
    db.commit()
    db.refresh(svc)
    return svc


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service(
    service_id: UUID,
    db: Session = Depends(get_db),
    current: User = Depends(require_roles("owner", "admin")),
):
    svc = db.get(Service, service_id)
    if not svc or svc.tenant_id != current.tenant_id:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    svc.active = False  # soft-delete: no s'esborra físicament (històric de facturació)
    db.commit()
    return None
