from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.auth import get_current_user
from db.session import get_db
from models.CarMaker import CarMaker
from models.CarMakerAbroad import CarMakerAbroad
from models.CarModel import CarModel
from models.CarModelAbroad import CarModelAbroad
from models.ChargingRecord import ChargingRecord
from models.ConsumableItem import Consumable, ConsumableItem
from models.Expense import Expense
from models.FuelRecord import FuelRecord
from models.MaintenanceRecord import MaintenanceRecord
from models.Notification import Notification
from models.Tire import TireMeasurement, TireServiceRecord, VehicleTire
from models.User import User
from models.Vehicle import Vehicle
from models.VehicleOdometerLog import VehicleOdometerLog
from models.legalinfo import LegalInfo, LegalNotification
from schemas.vehicle import VehicleCreate

router = APIRouter(tags=["vehicles"])


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
        fuelType=vehicle.fuelType,
        model=vehicle.model,
        year=vehicle.year,
        odo_km=vehicle.odo_km,
        owner_name=vehicle.owner_name,
    )
    db.add(new_vehicle)
    db.commit()
    db.refresh(new_vehicle)
    return {"success": True, "vehicle": new_vehicle.id, "id": new_vehicle.id}


@router.get("/list")
def list_vehicles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Vehicle).filter(Vehicle.user_id == current_user.id).all()


@router.delete("/{vehicle_id}")
def delete_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.user_id == current_user.id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="차량을 찾을 수 없습니다.")

    db.query(Notification).filter(Notification.vehicle_id == vehicle_id).delete(synchronize_session=False)
    db.query(MaintenanceRecord).filter(MaintenanceRecord.vehicle_id == vehicle_id).delete(synchronize_session=False)
    db.query(Consumable).filter(Consumable.vehicle_id == vehicle_id).delete(synchronize_session=False)
    db.query(ConsumableItem).filter(ConsumableItem.vehicle_id == vehicle_id).delete(synchronize_session=False)
    db.query(TireMeasurement).filter(TireMeasurement.vehicle_id == vehicle_id).delete(synchronize_session=False)
    db.query(TireServiceRecord).filter(TireServiceRecord.vehicle_id == vehicle_id).delete(synchronize_session=False)
    db.query(VehicleTire).filter(VehicleTire.vehicle_id == vehicle_id).delete(synchronize_session=False)
    db.query(LegalNotification).filter(LegalNotification.vehicle_id == vehicle_id).delete(synchronize_session=False)
    db.query(LegalInfo).filter(LegalInfo.vehicle_id == vehicle_id).delete(synchronize_session=False)
    db.query(FuelRecord).filter(FuelRecord.vehicle_id == vehicle_id).delete(synchronize_session=False)
    db.query(ChargingRecord).filter(ChargingRecord.vehicle_id == vehicle_id).delete(synchronize_session=False)
    db.query(Expense).filter(Expense.vehicle_id == vehicle_id).delete(synchronize_session=False)
    db.query(VehicleOdometerLog).filter(VehicleOdometerLog.vehicle_id == vehicle_id).delete(synchronize_session=False)

    db.delete(vehicle)
    db.commit()
    return {"success": True, "ok": True}


@router.get("/makers/domestic", response_model=List[str])
def get_domestic_makers(db: Session = Depends(get_db)):
    makers = db.query(CarMaker).all()
    return [maker.name for maker in makers]


@router.get("/models/domestic")
def list_domestic_models(maker: str, db: Session = Depends(get_db)):
    maker_obj = db.query(CarMaker).filter_by(name=maker).first()
    if not maker_obj:
        return []
    models = db.query(CarModel).filter_by(maker_id=maker_obj.id).all()
    return [
        {
            "id": model.id,
            "name": model.name,
            "displacement_cc": model.displacement_cc,
        }
        for model in models
    ]


@router.get("/makers/abroad", response_model=List[str])
def get_abroad_makers(db: Session = Depends(get_db)):
    makers = db.query(CarMakerAbroad).all()
    return [maker.name for maker in makers]


@router.get("/models/abroad")
def list_abroad_models(maker: str, db: Session = Depends(get_db)):
    maker_obj = db.query(CarMakerAbroad).filter_by(name=maker).first()
    if not maker_obj:
        return []
    models = db.query(CarModelAbroad).filter_by(maker_id=maker_obj.id).all()
    return [
        {
            "id": model.id,
            "name": model.name,
            "displacement_cc": model.displacement_cc,
        }
        for model in models
    ]
