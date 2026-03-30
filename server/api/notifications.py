from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.auth import get_current_user
from db.session import get_db
from models.Notification import Notification
from models.User import User
from models.Vehicle import Vehicle
from schemas.notification import NotificationUpdateSchema

router = APIRouter()


def ensure_vehicle(vehicle_id: int, current_user: User, db: Session) -> Vehicle:
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.user_id == current_user.id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle


@router.get("")
def list_notifications(userId: int, vehicleId: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.id != userId:
        raise HTTPException(status_code=403, detail="Forbidden")
    ensure_vehicle(vehicleId, current_user, db)
    return db.query(Notification).filter(Notification.user_id == userId, Notification.vehicle_id == vehicleId).all()


@router.put("")
def update_notification(payload: NotificationUpdateSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.id != payload.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    ensure_vehicle(payload.vehicle_id, current_user, db)
    notif = (
        db.query(Notification)
        .filter(Notification.user_id == payload.user_id, Notification.vehicle_id == payload.vehicle_id, Notification.type == payload.type)
        .first()
    )

    if notif:
        notif.enabled = payload.enabled
    else:
        notif = Notification(
            user_id=payload.user_id,
            vehicle_id=payload.vehicle_id,
            type=payload.type,
            enabled=payload.enabled,
        )
        db.add(notif)

    db.commit()
    db.refresh(notif)
    return notif
