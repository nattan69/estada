from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from ...database import get_db
from ...models.models import Tenant, User
from ...schemas.schemas import TenantCreate, TenantOut
from ...services.security import require_roles

router = APIRouter()

@router.get("", response_model=List[TenantOut])
def list_tenants(db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin"))):
    return db.query(Tenant).all()

@router.post("", response_model=TenantOut, status_code=status.HTTP_201_CREATED)
def create_tenant(payload: TenantCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin"))):
    tenant = Tenant(**payload.model_dump())
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant

@router.get("/{tenant_id}", response_model=TenantOut)
def get_tenant(tenant_id: UUID, db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin"))):
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
    return tenant
