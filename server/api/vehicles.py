from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from db.session import get_db
from models.Vehicle import Vehicle
from models.CarMaker import CarMaker
from models.CarModel import CarModel
from models.CarMakerAbroad import CarMakerAbroad
from models.CarModelAbroad import CarModelAbroad
from schemas.vehicle import VehicleCreate
from models.User import User
from core.auth import get_current_user  # JWT 토큰에서 사용자 추출

router = APIRouter(tags=["vehicles"])

# 차량 등록
@router.post("/add")
def add_vehicle(
    vehicle: VehicleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_vehicle = Vehicle(
        user_id=current_user.id,
        plate_no=vehicle.plate_no,
        maker=vehicle.maker,
        makerType=vehicle.makerType,
        model=vehicle.model,
        year=vehicle.year,
        odo_km=vehicle.odo_km,
        owner_name=vehicle.owner_name,
    )
    db.add(new_vehicle)
    db.commit()
    db.refresh(new_vehicle)
    return {"success": True, "vehicle": new_vehicle.id}

# 차량 조회
@router.get("/list") 
def list_vehicles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)): 
    return db.query(Vehicle).filter(Vehicle.user_id == current_user.id).all()

# 국산 제조사

@router.get("/makers/domestic", response_model=List[str])
def get_domestic_makers(db: Session = Depends(get_db)):
    makers = db.query(CarMaker).all()
    return [m.name for m in makers]

# 국산 모델
@router.get("/models/domestic")
def list_domestic_models(maker: str, db: Session = Depends(get_db)):
    maker_obj = db.query(CarMaker).filter_by(name=maker).first()
    if not maker_obj:
        return []
    models = db.query(CarModel).filter_by(maker_id=maker_obj.id).all()
    return [
        {
            "id": m.id,
            "name": m.name,
            "displacement_cc": m.displacement_cc   # ✅ 배기량 포함
        }
        for m in models
    ]

# 수입 제조사

@router.get("/makers/abroad", response_model=List[str])
def get_abroad_makers(db: Session = Depends(get_db)):
    makers = db.query(CarMakerAbroad).all()
    return [m.name for m in makers]

# 수입 모델
@router.get("/models/abroad")
def list_abroad_models(maker: str, db: Session = Depends(get_db)):
    maker_obj = db.query(CarMakerAbroad).filter_by(name=maker).first()
    if not maker_obj:
        return []
    models = db.query(CarModelAbroad).filter_by(maker_id=maker_obj.id).all()
    return [
        {
            "id": m.id,
            "name": m.name,
            "displacement_cc": m.displacement_cc   # ✅ 배기량 포함
        }
        for m in models
    ]

@router.get("/debug/makers/raw")
def debug_makers_raw(db: Session = Depends(get_db)):
    rows = db.execute("SELECT id, name FROM car_makers").fetchall()
    return [dict(r) for r in rows]
