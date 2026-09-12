from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from ...database import get_db
from ...schemas.schemas import AvailabilityResponse, AvailabilityRequest
from ...models.models import User
from ...services.availability_service import search_availability
from ...services.security import require_roles

router = APIRouter()

@router.get("", response_model=List[AvailabilityResponse])
def get_availability(
    propertyId: str = Query(...),
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    adults: int = Query(...),
    children: int = Query(0),
    ratePlanId: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("owner", "admin", "manager", "reception")),
):
    try:
        results = search_availability(
            db=db,
            property_id=propertyId,
            check_in=from_date,
            check_out=to_date,
            adults=adults,
            children=children,
            rate_plan_id=ratePlanId
        )
        return results
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
