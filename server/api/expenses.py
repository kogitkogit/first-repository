from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.session import get_db
from models.Expense import Expense

router = APIRouter()

@router.post("/add")
def add_expense(body: dict, db: Session = Depends(get_db)):
    item = Expense(**body)
    db.add(item); db.commit(); db.refresh(item)
    return item

@router.get("/list")
def list_expenses(vehicleId: int, db: Session = Depends(get_db)):
    return db.query(Expense).filter(Expense.vehicle_id == vehicleId).all()
