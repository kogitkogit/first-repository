from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.auth import get_current_user
from core.security import create_token, hash_password, verify_password
from db.session import get_db
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
from schemas.auth import DeleteAccountIn, LoginIn, RegisterIn, ResetPasswordIn, TokenOut

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


@router.post("/reset")
def reset_password(body: ResetPasswordIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user:
        raise HTTPException(404, "User not found")
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(401, "Invalid current password")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"success": True}


@router.post("/delete-account")
def delete_account(
    body: DeleteAccountIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(401, "Invalid current password")

    vehicle_ids = [row[0] for row in db.query(Vehicle.id).filter(Vehicle.user_id == current_user.id).all()]

    if vehicle_ids:
        db.query(TireMeasurement).filter(TireMeasurement.vehicle_id.in_(vehicle_ids)).delete(synchronize_session=False)
        db.query(TireServiceRecord).filter(TireServiceRecord.vehicle_id.in_(vehicle_ids)).delete(synchronize_session=False)
        db.query(VehicleTire).filter(VehicleTire.vehicle_id.in_(vehicle_ids)).delete(synchronize_session=False)
        db.query(VehicleOdometerLog).filter(VehicleOdometerLog.vehicle_id.in_(vehicle_ids)).delete(synchronize_session=False)
        db.query(FuelRecord).filter(FuelRecord.vehicle_id.in_(vehicle_ids)).delete(synchronize_session=False)
        db.query(Expense).filter(Expense.vehicle_id.in_(vehicle_ids)).delete(synchronize_session=False)
        db.query(MaintenanceRecord).filter(MaintenanceRecord.vehicle_id.in_(vehicle_ids)).delete(synchronize_session=False)
        db.query(Consumable).filter(Consumable.vehicle_id.in_(vehicle_ids)).delete(synchronize_session=False)
        db.query(ConsumableItem).filter(ConsumableItem.vehicle_id.in_(vehicle_ids)).delete(synchronize_session=False)
        db.query(Notification).filter(Notification.vehicle_id.in_(vehicle_ids)).delete(synchronize_session=False)
        db.query(LegalNotification).filter(LegalNotification.vehicle_id.in_(vehicle_ids)).delete(synchronize_session=False)
        db.query(LegalInfo).filter(LegalInfo.vehicle_id.in_(vehicle_ids)).delete(synchronize_session=False)
        db.query(Vehicle).filter(Vehicle.id.in_(vehicle_ids)).delete(synchronize_session=False)

    db.query(Notification).filter(Notification.user_id == current_user.id).delete(synchronize_session=False)
    db.query(MaintenanceRecord).filter(MaintenanceRecord.user_id == current_user.id).delete(synchronize_session=False)
    db.query(Consumable).filter(Consumable.user_id == current_user.id).delete(synchronize_session=False)
    db.query(ConsumableItem).filter(ConsumableItem.user_id == current_user.id).delete(synchronize_session=False)
    db.query(VehicleTire).filter(VehicleTire.user_id == current_user.id).delete(synchronize_session=False)
    db.query(TireMeasurement).filter(TireMeasurement.user_id == current_user.id).delete(synchronize_session=False)
    db.query(TireServiceRecord).filter(TireServiceRecord.user_id == current_user.id).delete(synchronize_session=False)
    db.query(LegalNotification).filter(LegalNotification.user_id == current_user.id).delete(synchronize_session=False)
    db.query(LegalInfo).filter(LegalInfo.user_id == current_user.id).delete(synchronize_session=False)
    db.query(User).filter(User.id == current_user.id).delete(synchronize_session=False)
    db.commit()
    return {"success": True}
