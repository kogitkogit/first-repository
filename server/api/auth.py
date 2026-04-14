import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.auth import get_current_user
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
