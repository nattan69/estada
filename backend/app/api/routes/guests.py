from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from ...database import get_db
from ...models.models import Guest, User
from ...schemas.schemas import GuestCreate, GuestOut, GuestUpdate, MrzParseRequest, OcrRequest
from ...services.security import require_roles
from ...services.mrz_parser import parse_mrz, to_guest_fields
from ...services.ocr_service import ocr_from_base64

router = APIRouter()

@router.post("/parse-mrz")
def parse_document_mrz(payload: MrzParseRequest, _: User = Depends(require_roles("owner", "admin", "manager", "reception"))):
    """Parseja el text MRZ (ICAO 9303) d'un passaport/DNI i retorna les dades del client.

    Serveix tant per a lectors físics USB (keyboard wedge, que escriuen el text
    MRZ directament) com per a OCR posterior sobre una foto del document.
    """
    parsed = parse_mrz(payload.mrz_text)
    if "error" in parsed:
        raise HTTPException(status_code=422, detail=parsed["error"])
    return {"parsed": parsed, "guest_fields": to_guest_fields(parsed)}


@router.post("/ocr")
def ocr_document(payload: OcrRequest, _: User = Depends(require_roles("owner", "admin", "manager", "reception"))):
    """Reconeix el MRZ d'una foto (base64) del document i retorna les dades del client."""
    result = ocr_from_base64(payload.image_base64)
    if "error" in result:
        raise HTTPException(status_code=422, detail=result["error"])
    return {"parsed": result, "guest_fields": to_guest_fields(result)}

@router.get("", response_model=List[GuestOut])
def list_guests(
    tenant_id: Optional[UUID] = None,
    email: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("owner", "admin", "manager", "reception")),
):
    query = db.query(Guest)
    if tenant_id:
        query = query.filter(Guest.tenant_id == tenant_id)
    if email:
        query = query.filter(Guest.email == email)
    return query.all()

@router.post("", response_model=GuestOut, status_code=status.HTTP_201_CREATED)
def create_guest(payload: GuestCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin", "manager", "reception"))):
    guest = Guest(**payload.model_dump())
    db.add(guest)
    db.commit()
    db.refresh(guest)
    return guest

@router.get("/{guest_id}", response_model=GuestOut)
def get_guest(guest_id: UUID, db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin", "manager", "reception"))):
    guest = db.get(Guest, guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Huésped no encontrado")
    return guest

@router.patch("/{guest_id}", response_model=GuestOut)
def update_guest(guest_id: UUID, payload: GuestUpdate, db: Session = Depends(get_db), _: User = Depends(require_roles("owner", "admin", "manager", "reception"))):
    guest = db.get(Guest, guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Huésped no encontrado")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(guest, key, value)
    db.commit()
    db.refresh(guest)
    return guest
