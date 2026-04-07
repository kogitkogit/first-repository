import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.security import create_token, hash_password, verify_password
from db.session import get_db
from models.User import User
from schemas.auth import LoginIn, RegisterIn, TokenOut

router = APIRouter(tags=["auth"])


def account_type_for(user: User) -> str:
    return "guest" if user.username.startswith("guest_") else "registered"


def build_token_response(user: User) -> TokenOut:
    token = create_token(str(user.id))
    return TokenOut(
        access_token=token,
        user_id=user.id,
        username=user.username,
        account_type=account_type_for(user),
    )


def generate_guest_username(db: Session) -> str:
    while True:
        candidate = f"guest_{secrets.token_hex(5)}"
        exists = db.query(User).filter(User.username == candidate).first()
        if not exists:
            return candidate


@router.post("/register", response_model=TokenOut)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(400, "Username already registered")

    user = User(username=body.username, password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return build_token_response(user)


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    return build_token_response(user)


@router.post("/guest", response_model=TokenOut)
def guest_login(db: Session = Depends(get_db)):
    username = generate_guest_username(db)
    user = User(username=username, password_hash=hash_password(secrets.token_urlsafe(24)))
    db.add(user)
    db.commit()
    db.refresh(user)
    return build_token_response(user)
