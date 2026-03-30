from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.auth import get_current_user
from db.session import get_db
from models.User import User
from models.Vehicle import Vehicle
from models.VehicleOdometerLog import VehicleOdometerLog
from schemas.OdometerUpdate import OdometerUpdate

router = APIRouter()


def ensure_vehicle(vehicle_id: int, current_user: User, db: Session) -> Vehicle:
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.user_id == current_user.id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle


@router.post("/update")
def update_odometer(data: OdometerUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vehicle = ensure_vehicle(data.vehicleId, current_user, db)
    log = VehicleOdometerLog(vehicle_id=data.vehicleId, date=data.date, odo_km=data.odo_km)
    db.add(log)
    vehicle.odo_km = data.odo_km
    db.commit()
    return {"success": True}


@router.get("/current")
def get_current(vehicleId: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vehicle = ensure_vehicle(vehicleId, current_user, db)
    return {"odo_km": vehicle.odo_km}


@router.get("/monthly")
def get_monthly(vehicleId: int, year: int, month: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ensure_vehicle(vehicleId, current_user, db)
    start_date = date(year, month, 1)
    end_date = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    logs = (
        db.query(VehicleOdometerLog)
        .filter(VehicleOdometerLog.vehicle_id == vehicleId, VehicleOdometerLog.date >= start_date, VehicleOdometerLog.date < end_date)
        .order_by(VehicleOdometerLog.date.asc())
        .all()
    )

    if not logs:
        return {"distance": 0}

    prev_log = (
        db.query(VehicleOdometerLog)
        .filter(VehicleOdometerLog.vehicle_id == vehicleId, VehicleOdometerLog.date < start_date)
        .order_by(VehicleOdometerLog.date.desc())
        .first()
    )

    start_km = prev_log.odo_km if prev_log else logs[0].odo_km
    end_km = max(log.odo_km for log in logs)
    distance = max(0, end_km - start_km)
    return {"distance": distance, "start_km": start_km, "end_km": end_km, "count": len(logs)}


@router.get("/range")
def get_range(vehicleId: int, fromDate: date, toDate: date, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ensure_vehicle(vehicleId, current_user, db)
    logs = (
        db.query(VehicleOdometerLog)
        .filter(VehicleOdometerLog.vehicle_id == vehicleId, VehicleOdometerLog.date >= fromDate, VehicleOdometerLog.date <= toDate)
        .order_by(VehicleOdometerLog.date.asc())
        .all()
    )
    if not logs:
        return {"distance": 0}
    return {"distance": logs[-1].odo_km - logs[0].odo_km}
