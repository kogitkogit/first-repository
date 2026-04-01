from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.auth import get_current_user
from db.session import get_db
from models.ChargingRecord import ChargingRecord
from models.User import User
from models.Vehicle import Vehicle
from schemas.charging import ChargingCreate, ChargingOut

router = APIRouter()


def ensure_vehicle(vehicle_id: int, current_user: User, db: Session) -> Vehicle:
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.user_id == current_user.id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle


def serialize_charging_record(record: ChargingRecord) -> dict:
    return {
        "id": record.id,
        "vehicle_id": record.vehicle_id,
        "date": record.date.isoformat() if record.date else None,
        "energy_kwh": float(record.energy_kwh) if record.energy_kwh is not None else None,
        "price_total": float(record.price_total) if record.price_total is not None else None,
        "odo_km": record.odo_km,
        "charge_type": record.charge_type,
        "battery_before_percent": record.battery_before_percent,
        "battery_after_percent": record.battery_after_percent,
    }


@router.post("/add", response_model=ChargingOut)
def add_charging(
    body: ChargingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_vehicle(body.vehicle_id, current_user, db)
    record = ChargingRecord(**body.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return serialize_charging_record(record)


@router.get("/list", response_model=list[ChargingOut])
def list_charging(vehicleId: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ensure_vehicle(vehicleId, current_user, db)
    records = (
        db.query(ChargingRecord)
        .filter(ChargingRecord.vehicle_id == vehicleId)
        .order_by(ChargingRecord.date.desc(), ChargingRecord.id.desc())
        .all()
    )
    return [serialize_charging_record(record) for record in records]


@router.put("/{charging_id}", response_model=ChargingOut)
def update_charging(
    charging_id: int,
    payload: ChargingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_vehicle(payload.vehicle_id, current_user, db)
    record = (
        db.query(ChargingRecord)
        .filter(ChargingRecord.id == charging_id, ChargingRecord.vehicle_id == payload.vehicle_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Charging record not found")
    for field, value in payload.model_dump().items():
        setattr(record, field, value)
    db.add(record)
    db.commit()
    db.refresh(record)
    return serialize_charging_record(record)


@router.delete("/{charging_id}")
def delete_charging(charging_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    record = db.query(ChargingRecord).filter(ChargingRecord.id == charging_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Charging record not found")
    ensure_vehicle(record.vehicle_id, current_user, db)
    db.delete(record)
    db.commit()
    return {"ok": True}


@router.get("/stats")
def charging_stats(vehicleId: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ensure_vehicle(vehicleId, current_user, db)
    rows = (
        db.query(ChargingRecord)
        .filter(ChargingRecord.vehicle_id == vehicleId)
        .order_by(ChargingRecord.odo_km, ChargingRecord.date, ChargingRecord.id)
        .all()
    )
    total_cost = float(sum(float(row.price_total or 0) for row in rows))
    total_kwh = float(sum(float(row.energy_kwh or 0) for row in rows))
    if len(rows) < 2:
        return {"avg_km_per_kwh": None, "total_cost": total_cost, "total_kwh": total_kwh}
    distance_km = (rows[-1].odo_km or 0) - (rows[0].odo_km or 0)
    consumed_kwh = sum(float(row.energy_kwh or 0) for row in rows[1:])
    avg = (distance_km / consumed_kwh) if consumed_kwh > 0 else None
    return {"avg_km_per_kwh": avg, "total_cost": total_cost, "total_kwh": total_kwh}
