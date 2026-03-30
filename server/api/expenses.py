from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.auth import get_current_user
from db.session import get_db
from models.Expense import Expense
from models.User import User
from models.Vehicle import Vehicle

router = APIRouter()


def ensure_vehicle(vehicle_id: int, current_user: User, db: Session) -> Vehicle:
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.user_id == current_user.id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle


@router.post("/add")
def add_expense(body: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vehicle_id = body.get("vehicle_id")
    if not vehicle_id:
        raise HTTPException(status_code=400, detail="vehicle_id is required")
    ensure_vehicle(int(vehicle_id), current_user, db)
    item = Expense(**body)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/list")
def list_expenses(vehicleId: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ensure_vehicle(vehicleId, current_user, db)
    return db.query(Expense).filter(Expense.vehicle_id == vehicleId).all()
