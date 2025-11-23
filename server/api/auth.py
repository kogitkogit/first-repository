from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from models.User import User
from core.security import hash_password, verify_password, create_token
from schemas.auth import RegisterIn, LoginIn, TokenOut

router = APIRouter(tags=["auth"])

@router.post("/register", response_model=TokenOut)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(400, "Username already registered")
    print(f"입력된 비밀번호(raw): {body.password} / 길이: {len(body.password.encode('utf-8'))}")

    u = User(username=body.username, password_hash=hash_password(body.password))
    db.add(u); db.commit(); db.refresh(u)
    token = create_token(str(u.id))
    return TokenOut(access_token=token, user_id=u.id)

@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.username == body.username).first()
    if not u or not verify_password(body.password, u.password_hash):
        raise HTTPException(401, "Invalid credentials")
    token = create_token(str(u.id))
    return TokenOut(access_token=token, user_id=u.id)
