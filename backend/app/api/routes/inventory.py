from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ...database import get_db
from ...models.models import Inventory
from ...schemas.schemas import InventoryBulkUpsert, InventoryEntry

router = APIRouter()

@router.post("/bulk-upsert")
def bulk_upsert_inventory(payload: InventoryBulkUpsert, db: Session = Depends(get_db)):
    upserted = 0
    for entry in payload.inventory:
        inventory = db.query(Inventory).filter(
            Inventory.room_type_id == payload.room_type_id,
            Inventory.date == entry.date
        ).first()
        
        if inventory:
            inventory.allotment = entry.allotment
            inventory.sold = entry.sold
            inventory.blocked = entry.blocked
            inventory.overbooking_allowed = entry.overbooking_allowed
        else:
            inventory = Inventory(
                room_type_id=payload.room_type_id,
                date=entry.date,
                allotment=entry.allotment,
                sold=entry.sold,
                blocked=entry.blocked,
                overbooking_allowed=entry.overbooking_allowed
            )
            db.add(inventory)
            
        db.commit()
        upserted += 1
        
    return {"upserted": upserted}
