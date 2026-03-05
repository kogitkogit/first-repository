from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.auth import get_current_user
from core.ownership import ensure_vehicle_owned
from db.session import get_db
from models.Expense import Expense
from models.User import User

router = APIRouter()


@router.post("/add")
def add_expense(
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle_id = body.get("vehicle_id")
    if vehicle_id is None:
        raise HTTPException(status_code=400, detail="vehicle_id is required")
    vehicle = ensure_vehicle_owned(vehicle_id, current_user, db)
    payload = dict(body)
    payload["vehicle_id"] = vehicle.id

    item = Expense(**payload)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/list")
def list_expenses(
    vehicleId: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = ensure_vehicle_owned(vehicleId, current_user, db)
    return db.query(Expense).filter(Expense.vehicle_id == vehicle.id).all()
