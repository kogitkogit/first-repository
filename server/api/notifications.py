from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db.session import get_db
from models.Notification import Notification
from schemas.notification import NotificationUpdateSchema

router = APIRouter()

@router.get("/")
def list_notifications(userId: int, vehicleId: int, db: Session = Depends(get_db)):
    return (
        db.query(Notification)
        .filter(
            Notification.user_id == userId,
            Notification.vehicle_id == vehicleId,
        )
        .all()
    )

@router.put("/")
def update_notification(payload: NotificationUpdateSchema, db: Session = Depends(get_db)):
    notif = (
        db.query(Notification)
        .filter(
            Notification.user_id == payload.user_id,
            Notification.vehicle_id == payload.vehicle_id,
            Notification.type == payload.type,
        )
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

    if payload.enabled:
        notify_user(payload.user_id, payload.vehicle_id, payload.type, "알림이 활성화되었습니다.")

    return notif


def notify_user(user_id: int, vehicle_id: int, type: str, message: str):
    """Placeholder for push notification integration."""
    print(f"[알림] user:{user_id}, vehicle:{vehicle_id}, type:{type} => {message}")
    return {"status": "sent", "message": message}
