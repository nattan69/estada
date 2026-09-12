"""Configuració i càlcul de l'Impost sobre Estades Turístiques (ITS/ecotaxa).

La configuració viu per establiment (property) amb historial per any. El
càlcul (`POST /ecotax/calculate`) previsualitza l'import per a una estada
(per persona/nit, amb temporada, bonificació nit 9 i exempció <16).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from ...database import get_db
from ...models.models import EcoTaxConfig, User
from ...schemas.schemas import (
    EcoTaxConfigCreate,
    EcoTaxConfigUpdate,
    EcoTaxConfigOut,
    EcoTaxCalcRequest,
    EcoTaxCalcResult,
)
from ...services.security import require_roles
from ...services.ecotax_service import calculate_ecotax

router = APIRouter()


@router.get("/configs", response_model=List[EcoTaxConfigOut])
def list_configs(
    propertyId: UUID,
    db: Session = Depends(get_db),
    current: User = Depends(require_roles("owner", "admin", "manager", "reception", "accounting")),
):
    return (
        db.query(EcoTaxConfig)
        .filter(EcoTaxConfig.property_id == propertyId)
        .order_by(EcoTaxConfig.created_at.desc())
        .all()
    )


@router.post("/configs", response_model=EcoTaxConfigOut, status_code=status.HTTP_201_CREATED)
def create_config(
    payload: EcoTaxConfigCreate,
    db: Session = Depends(get_db),
    current: User = Depends(require_roles("owner", "admin", "manager")),
):
    cfg = EcoTaxConfig(**payload.model_dump())
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return cfg


@router.get("/configs/{config_id}", response_model=EcoTaxConfigOut)
def get_config(
    config_id: UUID,
    db: Session = Depends(get_db),
    current: User = Depends(require_roles("owner", "admin", "manager", "reception", "accounting")),
):
    cfg = db.get(EcoTaxConfig, config_id)
    if not cfg:
        raise HTTPException(status_code=404, detail="Configuración de ecotaxa no encontrada")
    return cfg


@router.patch("/configs/{config_id}", response_model=EcoTaxConfigOut)
def update_config(
    config_id: UUID,
    payload: EcoTaxConfigUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(require_roles("owner", "admin", "manager")),
):
    cfg = db.get(EcoTaxConfig, config_id)
    if not cfg:
        raise HTTPException(status_code=404, detail="Configuración de ecotaxa no encontrada")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(cfg, key, value)
    db.commit()
    db.refresh(cfg)
    return cfg


@router.delete("/configs/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_config(
    config_id: UUID,
    db: Session = Depends(get_db),
    current: User = Depends(require_roles("owner", "admin")),
):
    cfg = db.get(EcoTaxConfig, config_id)
    if not cfg:
        raise HTTPException(status_code=404, detail="Configuración de ecotaxa no encontrada")
    db.delete(cfg)
    db.commit()
    return None


@router.post("/calculate", response_model=EcoTaxCalcResult)
def calc_ecotax(
    payload: EcoTaxCalcRequest,
    db: Session = Depends(get_db),
    current: User = Depends(require_roles("owner", "admin", "manager", "reception", "accounting")),
):
    result = calculate_ecotax(
        db,
        property_id=payload.property_id,
        check_in=payload.check_in,
        check_out=payload.check_out,
        adults=payload.adults,
        children=payload.children,
    )
    return result
