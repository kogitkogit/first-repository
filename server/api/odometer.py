from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.auth import get_current_user
from db.session import get_db
from models.User import User
from models.Vehicle import Vehicle
from models.VehicleOdometerLog import VehicleOdometerLog
from schemas.OdometerUpdate import OdometerUpdate

router = APIRouter()


class OdometerLogUpdate(BaseModel):
    date: date
    odo_km: int


def serialize_log(log: VehicleOdometerLog) -> dict:
    return {
        "id": log.id,
        "vehicle_id": log.vehicle_id,
        "date": log.date.isoformat() if log.date else None,
        "odo_km": log.odo_km,
        "created_at": log.created_at.isoformat() if log.created_at else None,
    }


def ensure_vehicle(vehicle_id: int, current_user: User, db: Session) -> Vehicle:
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.user_id == current_user.id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle


def ensure_log(log_id: int, current_user: User, db: Session) -> VehicleOdometerLog:
    log = (
        db.query(VehicleOdometerLog)
        .join(Vehicle, Vehicle.id == VehicleOdometerLog.vehicle_id)
        .filter(VehicleOdometerLog.id == log_id, Vehicle.user_id == current_user.id)
        .first()
    )
    if not log:
        raise HTTPException(status_code=404, detail="Odometer log not found")
    return log


def refresh_vehicle_current_odo(vehicle: Vehicle, db: Session) -> int | None:
    latest_log = (
        db.query(VehicleOdometerLog)
        .filter(VehicleOdometerLog.vehicle_id == vehicle.id)
        .order_by(VehicleOdometerLog.date.desc(), VehicleOdometerLog.id.desc())
        .first()
    )
    vehicle.odo_km = latest_log.odo_km if latest_log else None
    return vehicle.odo_km


@router.post("/update")
def update_odometer(data: OdometerUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vehicle = ensure_vehicle(data.vehicleId, current_user, db)
    if data.date > date.today():
        raise HTTPException(status_code=400, detail="올바른 날짜를 선택해주세요.")
    log = VehicleOdometerLog(vehicle_id=data.vehicleId, date=data.date, odo_km=data.odo_km)
    db.add(log)
    vehicle.odo_km = data.odo_km
    db.commit()
    db.refresh(log)
    return {"success": True, "log": serialize_log(log), "current_odo_km": vehicle.odo_km}


@router.get("/current")
def get_current(vehicleId: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vehicle = ensure_vehicle(vehicleId, current_user, db)
    return {"odo_km": vehicle.odo_km}


@router.get("/history")
def get_history(vehicleId: int, limit: int = 50, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ensure_vehicle(vehicleId, current_user, db)
    logs = (
        db.query(VehicleOdometerLog)
        .filter(VehicleOdometerLog.vehicle_id == vehicleId)
        .order_by(VehicleOdometerLog.date.desc(), VehicleOdometerLog.id.desc())
        .limit(min(max(limit, 1), 200))
        .all()
    )
    return {"items": [serialize_log(log) for log in logs]}


@router.get("/overall")
def get_overall(vehicleId: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ensure_vehicle(vehicleId, current_user, db)
    first_log = (
        db.query(VehicleOdometerLog)
        .filter(VehicleOdometerLog.vehicle_id == vehicleId)
        .order_by(VehicleOdometerLog.date.asc(), VehicleOdometerLog.id.asc())
        .first()
    )
    last_log = (
        db.query(VehicleOdometerLog)
        .filter(VehicleOdometerLog.vehicle_id == vehicleId)
        .order_by(VehicleOdometerLog.date.desc(), VehicleOdometerLog.id.desc())
        .first()
    )
    count = db.query(VehicleOdometerLog).filter(VehicleOdometerLog.vehicle_id == vehicleId).count()

    if not first_log or not last_log:
        return {"distance": 0, "start_km": None, "end_km": None, "start_date": None, "end_date": None, "count": 0}

    return {
        "distance": max(0, last_log.odo_km - first_log.odo_km),
        "start_km": first_log.odo_km,
        "end_km": last_log.odo_km,
        "start_date": first_log.date.isoformat() if first_log.date else None,
        "end_date": last_log.date.isoformat() if last_log.date else None,
        "count": count,
    }


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
    vehicle = ensure_vehicle(vehicleId, current_user, db)
    if fromDate > toDate:
        raise HTTPException(status_code=400, detail="날짜 범위를 확인해주세요.")

    logs = (
        db.query(VehicleOdometerLog)
        .filter(VehicleOdometerLog.vehicle_id == vehicleId, VehicleOdometerLog.date >= fromDate, VehicleOdometerLog.date <= toDate)
        .order_by(VehicleOdometerLog.date.asc())
        .all()
    )
    start_log = (
        db.query(VehicleOdometerLog)
        .filter(VehicleOdometerLog.vehicle_id == vehicleId, VehicleOdometerLog.date <= fromDate)
        .order_by(VehicleOdometerLog.date.desc())
        .first()
    )
    end_log = (
        db.query(VehicleOdometerLog)
        .filter(VehicleOdometerLog.vehicle_id == vehicleId, VehicleOdometerLog.date <= toDate)
        .order_by(VehicleOdometerLog.date.desc())
        .first()
    )

    if not end_log:
        fallback_end_km = vehicle.odo_km if vehicle.odo_km is not None and toDate >= date.today() else 0
        return {"distance": 0, "start_km": fallback_end_km, "end_km": fallback_end_km, "count": 0}

    start_km = start_log.odo_km if start_log else logs[0].odo_km if logs else end_log.odo_km
    end_km = end_log.odo_km
    return {"distance": max(0, end_km - start_km), "start_km": start_km, "end_km": end_km, "count": len(logs)}


@router.put("/{log_id}")
def update_log(log_id: int, data: OdometerLogUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    log = ensure_log(log_id, current_user, db)
    if data.date > date.today():
        raise HTTPException(status_code=400, detail="올바른 날짜를 선택해주세요.")
    log.date = data.date
    log.odo_km = data.odo_km
    vehicle = ensure_vehicle(log.vehicle_id, current_user, db)
    current_odo = refresh_vehicle_current_odo(vehicle, db)
    db.commit()
    db.refresh(log)
    return {"success": True, "log": serialize_log(log), "current_odo_km": current_odo}


@router.delete("/{log_id}")
def delete_log(log_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    log = ensure_log(log_id, current_user, db)
    vehicle = ensure_vehicle(log.vehicle_id, current_user, db)
    db.delete(log)
    db.flush()
    current_odo = refresh_vehicle_current_odo(vehicle, db)
    db.commit()
    return {"success": True, "current_odo_km": current_odo}
