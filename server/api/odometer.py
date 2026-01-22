from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from db.session import get_db
from models.Vehicle import Vehicle
from models.VehicleOdometerLog import VehicleOdometerLog
from schemas.OdometerUpdate import OdometerUpdate
from schemas.OdometerDelete import OdometerDelete
from datetime import date

router = APIRouter()

@router.post("/update")
def update_odometer(data: OdometerUpdate, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == data.vehicleId).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    log = VehicleOdometerLog(vehicle_id=data.vehicleId, date=data.date, odo_km=data.odo_km)
    db.add(log)
    vehicle.odo_km = data.odo_km
    db.commit()
    return {"success": True}

@router.get("/current")
def get_current(vehicleId: int, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicleId).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    max_odo = (
        db.query(func.max(VehicleOdometerLog.odo_km))
        .filter(VehicleOdometerLog.vehicle_id == vehicleId)
        .scalar()
    )
    if max_odo != vehicle.odo_km:
        vehicle.odo_km = max_odo if max_odo is not None else None
        db.commit()
    return {"odo_km": vehicle.odo_km}

@router.get("/monthly")
def get_monthly(vehicleId: int, year: int, month: int, db: Session = Depends(get_db)):
    start_date = date(year, month, 1)
    end_date = date(year+1, 1, 1) if month == 12 else date(year, month+1, 1)

    logs = db.query(VehicleOdometerLog).filter(
        VehicleOdometerLog.vehicle_id == vehicleId,
        VehicleOdometerLog.date >= start_date,
        VehicleOdometerLog.date < end_date
    ).order_by(VehicleOdometerLog.date.asc()).all()

    if not logs:
        return {"distance": 0}

    prev_log = db.query(VehicleOdometerLog).filter(
        VehicleOdometerLog.vehicle_id == vehicleId,
        VehicleOdometerLog.date < start_date
    ).order_by(VehicleOdometerLog.date.desc()).first()

    start_km = prev_log.odo_km if prev_log else logs[0].odo_km
    end_km = max(log.odo_km for log in logs)  # 이번 달 최대값

    distance = max(0, end_km - start_km)

    return {
        "distance": distance,
        "start_km": start_km,
        "end_km": end_km,
        "count": len(logs)
    }

@router.get("/range")
def get_range(vehicleId: int, fromDate: date, toDate: date, db: Session = Depends(get_db)):
    logs = db.query(VehicleOdometerLog).filter(
        VehicleOdometerLog.vehicle_id == vehicleId,
        VehicleOdometerLog.date >= fromDate,
        VehicleOdometerLog.date <= toDate
    ).order_by(VehicleOdometerLog.date.asc()).all()
    if not logs:
        return {"distance": 0}
    return {"distance": logs[-1].odo_km - logs[0].odo_km}

@router.get("/logs")
def get_logs(vehicleId: int, db: Session = Depends(get_db)):
    logs = (
        db.query(VehicleOdometerLog)
        .filter(VehicleOdometerLog.vehicle_id == vehicleId)
        .order_by(VehicleOdometerLog.date.desc(), VehicleOdometerLog.id.desc())
        .all()
    )
    return [{"id": log.id, "date": log.date, "odo_km": log.odo_km} for log in logs]

@router.post("/delete")
def delete_logs(data: OdometerDelete, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == data.vehicleId).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if not data.ids:
        return {"success": True, "deleted": 0}

    logs = (
        db.query(VehicleOdometerLog)
        .filter(VehicleOdometerLog.vehicle_id == data.vehicleId, VehicleOdometerLog.id.in_(data.ids))
        .all()
    )
    if not logs:
        return {"success": True, "deleted": 0}

    for log in logs:
        db.delete(log)

    max_odo = (
        db.query(func.max(VehicleOdometerLog.odo_km))
        .filter(VehicleOdometerLog.vehicle_id == data.vehicleId)
        .scalar()
    )
    vehicle.odo_km = max_odo if max_odo is not None else None
    db.commit()
    return {"success": True, "deleted": len(logs)}
