from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from db.session import get_db
from models.FuelRecord import FuelRecord
from schemas.fuel import FuelCreate, FuelOut
from schemas.fuel import FuelCreate, FuelOut

router = APIRouter()

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
def add_fuel(body: FuelCreate, db: Session = Depends(get_db)):
    record = FuelRecord(**body.dict())
    db.add(record)
    db.commit()
    db.refresh(record)
    return serialize_fuel_record(record)

@router.get("/list", response_model=list[FuelOut])
def list_fuel(vehicleId: int, db: Session = Depends(get_db)):
    records = (
        db.query(FuelRecord)
        .filter(FuelRecord.vehicle_id == vehicleId)
        .order_by(FuelRecord.date.desc())
        .all()
    )
    return [serialize_fuel_record(r) for r in records]

@router.put("/{fuel_id}", response_model=FuelOut)
def update_fuel(fuel_id: int, payload: FuelCreate, db: Session = Depends(get_db)):
    record = db.query(FuelRecord).get(fuel_id)
    if not record:
        raise HTTPException(status_code=404, detail="Fuel record not found")
    for field, value in payload.dict().items():
        setattr(record, field, value)
    db.add(record)
    db.commit()
    db.refresh(record)
    return serialize_fuel_record(record)

@router.delete("/{fuel_id}")
def delete_fuel(fuel_id: int, db: Session = Depends(get_db)):
    record = db.query(FuelRecord).get(fuel_id)
    if not record:
        raise HTTPException(status_code=404, detail="Fuel record not found")
    db.delete(record)
    db.commit()
    return {"ok": True}

@router.get("/stats")
def fuel_stats(vehicleId: int, db: Session = Depends(get_db)):
    rows = (
        db.query(FuelRecord)
        .filter(FuelRecord.vehicle_id == vehicleId, FuelRecord.is_full == True)
        .order_by(FuelRecord.odo_km)
        .all()
    )
    total_cost = float(sum(float(r.price_total or 0) for r in rows))
    if len(rows) < 2:
        return {"avg_km_per_l": None, "total_cost": total_cost}
    km = rows[-1].odo_km - rows[0].odo_km
    liters = sum(float(r.liters or 0) for r in rows[1:])
    avg = (km / liters) if liters > 0 else None
    return {"avg_km_per_l": avg, "total_cost": total_cost}
