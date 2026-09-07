from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from ...database import get_db
from ...models.models import User
from ...schemas.schemas import UserOut

class LoginRequest(BaseModel):
    email: str
    password: str

router = APIRouter()

@router.post("/login")
def login(payload: LoginRequest):
    return {"access_token": "dummy-token", "token_type": "bearer"}

@router.post("/refresh")
def refresh():
    return {"access_token": "dummy-token", "token_type": "bearer"}

@router.get("/me", response_model=UserOut)
def get_me(db: Session = Depends(get_db)):
    user = db.query(User).first()
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no autenticado")
    return user
