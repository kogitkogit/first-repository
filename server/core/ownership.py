from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.User import User
from models.Vehicle import Vehicle


def ensure_vehicle_owned(vehicle_id: int, user: User, db: Session) -> Vehicle:
    vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.id == vehicle_id, Vehicle.user_id == user.id)
        .first()
    )
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle
