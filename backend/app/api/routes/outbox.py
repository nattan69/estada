from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from ...database import get_db
from ...models.models import OutboxEvent, User
from ...schemas.schemas import OutboxEventOut
from ...services.outbox import dispatch_pending
from ...services.security import require_roles

router = APIRouter()


@router.get("", response_model=List[OutboxEventOut])
def list_events(
    event_status: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("owner", "admin", "manager")),
):
    """Llista els esdeveniments de l'outbox (filtrable per estat)."""
    q = db.query(OutboxEvent)
    if event_status:
        q = q.filter(OutboxEvent.status == event_status)
    return q.order_by(OutboxEvent.created_at.desc()).limit(min(limit, 500)).all()


@router.post("/dispatch")
def dispatch(
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("owner", "admin", "manager")),
):
    """Processa els esdeveniments pendents de l'outbox (manual o via cron)."""
    return dispatch_pending(db, limit=limit)
