import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from core.auth import get_current_user
from core.config import settings
from core.security import create_token, hash_password, verify_password
from db.session import get_db
from models.ChargingRecord import ChargingRecord
from models.ConsumableItem import Consumable, ConsumableItem
from models.Expense import Expense
from models.FuelRecord import FuelRecord
from models.MaintenanceRecord import MaintenanceRecord
from models.Notification import Notification
from models.Tire import TireMeasurement, TireServiceRecord, VehicleTire
from models.User import User
from models.Vehicle import Vehicle
from models.VehicleOdometerLog import VehicleOdometerLog
from models.legalinfo import LegalInfo, LegalNotification
from schemas.auth import GuestResumeIn, LoginIn, RegisterIn, TokenOut

router = APIRouter(tags=["auth"])
GUEST_PASSWORD_SENTINEL = "!guest_account!"


def account_type_for(user: User) -> str:
    return "guest" if user.username.startswith("guest_") else "registered"


def build_guest_resume_token(user: User) -> str:
    payload = {
        "sub": user.username,
        "typ": "guest_resume",
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(days=365 * 5),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALG)


def build_token_response(user: User, include_guest_resume: bool = False) -> TokenOut:
    token = create_token(str(user.id))
    account_type = account_type_for(user)
    return TokenOut(
        access_token=token,
        user_id=user.id,
        username=user.username,
        account_type=account_type,
        guest_resume_token=build_guest_resume_token(user) if include_guest_resume and account_type == "guest" else None,
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
    if not user or account_type_for(user) == "guest" or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    return build_token_response(user)


@router.post("/guest", response_model=TokenOut)
def guest_login(db: Session = Depends(get_db)):
    username = generate_guest_username(db)
    user = User(username=username, password_hash=GUEST_PASSWORD_SENTINEL)
    db.add(user)
    db.commit()
    db.refresh(user)
    return build_token_response(user, include_guest_resume=True)


@router.post("/guest/resume", response_model=TokenOut)
def resume_guest(body: GuestResumeIn, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(body.resume_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALG])
    except JWTError:
        raise HTTPException(status_code=401, detail="비회원 세션을 다시 확인할 수 없습니다.")

    if payload.get("typ") != "guest_resume":
        raise HTTPException(status_code=401, detail="비회원 세션을 다시 확인할 수 없습니다.")

    username = payload.get("sub")
    if not username or not str(username).startswith("guest_"):
        raise HTTPException(status_code=401, detail="비회원 세션을 다시 확인할 수 없습니다.")

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="비회원 계정을 찾을 수 없습니다.")

    return build_token_response(user, include_guest_resume=True)


@router.delete("/me")
def delete_me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id
    vehicle_ids = [vehicle.id for vehicle in db.query(Vehicle.id).filter(Vehicle.user_id == user_id).all()]

    db.query(Notification).filter(Notification.user_id == user_id).delete(synchronize_session=False)
    db.query(MaintenanceRecord).filter(MaintenanceRecord.user_id == user_id).delete(synchronize_session=False)
    db.query(Consumable).filter(Consumable.user_id == user_id).delete(synchronize_session=False)
    db.query(ConsumableItem).filter(ConsumableItem.user_id == user_id).delete(synchronize_session=False)
    db.query(TireMeasurement).filter(TireMeasurement.user_id == user_id).delete(synchronize_session=False)
    db.query(TireServiceRecord).filter(TireServiceRecord.user_id == user_id).delete(synchronize_session=False)
    db.query(VehicleTire).filter(VehicleTire.user_id == user_id).delete(synchronize_session=False)
    db.query(LegalNotification).filter(LegalNotification.user_id == user_id).delete(synchronize_session=False)
    db.query(LegalInfo).filter(LegalInfo.user_id == user_id).delete(synchronize_session=False)
    if vehicle_ids:
        db.query(FuelRecord).filter(FuelRecord.vehicle_id.in_(vehicle_ids)).delete(synchronize_session=False)
        db.query(ChargingRecord).filter(ChargingRecord.vehicle_id.in_(vehicle_ids)).delete(synchronize_session=False)
        db.query(Expense).filter(Expense.vehicle_id.in_(vehicle_ids)).delete(synchronize_session=False)
        db.query(VehicleOdometerLog).filter(VehicleOdometerLog.vehicle_id.in_(vehicle_ids)).delete(synchronize_session=False)
        db.query(Vehicle).filter(Vehicle.id.in_(vehicle_ids)).delete(synchronize_session=False)
    db.query(User).filter(User.id == user_id).delete(synchronize_session=False)
    db.commit()
    return {"ok": True}
