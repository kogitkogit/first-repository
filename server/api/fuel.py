from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.auth import get_current_user
from db.session import get_db
from models.FuelRecord import FuelRecord
from models.User import User
from models.Vehicle import Vehicle
from schemas.fuel import FuelCreate, FuelOut

router = APIRouter()


def ensure_vehicle(vehicle_id: int, current_user: User, db: Session) -> Vehicle:
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.user_id == current_user.id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle


def serialize_fuel_record(record: FuelRecord) -> dict:
    return {
        "id": record.id,
        "vehicle_id": record.vehicle_id,
        "date": record.date.isoformat() if record.date else None,
        "liters": float(record.liters) if record.liters is not None else None,
        "price_total": float(record.price_total) if record.price_total is not None else None,
        "odo_km": record.odo_km,
        "is_full": record.is_full,
    }


@router.post("/add", response_model=FuelOut)
def add_fuel(body: FuelCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ensure_vehicle(body.vehicle_id, current_user, db)
    record = FuelRecord(**body.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return serialize_fuel_record(record)


@router.get("/list", response_model=list[FuelOut])
def list_fuel(vehicleId: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ensure_vehicle(vehicleId, current_user, db)
    records = db.query(FuelRecord).filter(FuelRecord.vehicle_id == vehicleId).order_by(FuelRecord.date.desc()).all()
    return [serialize_fuel_record(r) for r in records]


@router.put("/{fuel_id}", response_model=FuelOut)
def update_fuel(fuel_id: int, payload: FuelCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ensure_vehicle(payload.vehicle_id, current_user, db)
    record = db.query(FuelRecord).filter(FuelRecord.id == fuel_id, FuelRecord.vehicle_id == payload.vehicle_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Fuel record not found")
    for field, value in payload.model_dump().items():
        setattr(record, field, value)
    db.add(record)
    db.commit()
    db.refresh(record)
    return serialize_fuel_record(record)


@router.delete("/{fuel_id}")
def delete_fuel(fuel_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    record = db.query(FuelRecord).filter(FuelRecord.id == fuel_id).first()
    if not record:
      raise HTTPException(status_code=404, detail="Fuel record not found")
    ensure_vehicle(record.vehicle_id, current_user, db)
    db.delete(record)
    db.commit()
    return {"ok": True}


@router.get("/stats")
def fuel_stats(vehicleId: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ensure_vehicle(vehicleId, current_user, db)
    rows = db.query(FuelRecord).filter(FuelRecord.vehicle_id == vehicleId, FuelRecord.is_full == True).order_by(FuelRecord.odo_km).all()
    total_cost = float(sum(float(r.price_total or 0) for r in rows))
    if len(rows) < 2:
        return {"avg_km_per_l": None, "total_cost": total_cost}
    km = rows[-1].odo_km - rows[0].odo_km
    liters = sum(float(r.liters or 0) for r in rows[1:])
    avg = (km / liters) if liters > 0 else None
    return {"avg_km_per_l": avg, "total_cost": total_cost}
