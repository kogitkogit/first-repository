from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.security import create_token, hash_password, verify_password
from db.session import get_db
from models.User import User
from schemas.auth import LoginIn, RegisterIn, TokenOut

router = APIRouter(tags=["auth"])


@router.post("/register", response_model=TokenOut)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(400, "Username already registered")

    user = User(username=body.username, password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_token(str(user.id))
    return TokenOut(access_token=token, user_id=user.id)


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    token = create_token(str(user.id))
    return TokenOut(access_token=token, user_id=user.id)
