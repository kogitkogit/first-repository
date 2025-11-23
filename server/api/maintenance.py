
from datetime import date
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.auth import get_current_user
from db.session import get_db
from models.MaintenanceRecord import MaintenanceRecord
from models.User import User
from models.Vehicle import Vehicle
from schemas.maintenance import (
    MaintenanceCreate,
    MaintenanceOut,
    MaintenanceOverview,
    MaintenanceUpdate,
)
router = APIRouter(tags=["maintenance"])


def ensure_vehicle(vehicle_id: int, user: User, db: Session) -> Vehicle:
    vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.id == vehicle_id, Vehicle.user_id == user.id)
        .first()
    )
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle


@router.get("/records", response_model=List[MaintenanceOut])
def list_records(
    vehicleId: int = Query(..., alias="vehicleId"),
    serviceType: Optional[str] = Query(None, alias="serviceType"),
    fromDate: Optional[date] = Query(None, alias="fromDate"),
    toDate: Optional[date] = Query(None, alias="toDate"),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_vehicle(vehicleId, current_user, db)

    query = (
        db.query(MaintenanceRecord)
        .filter(MaintenanceRecord.vehicle_id == vehicleId)
        .order_by(MaintenanceRecord.service_date.desc(), MaintenanceRecord.created_at.desc())
    )

    if serviceType:
        query = query.filter(MaintenanceRecord.service_type == serviceType)
    if fromDate:
        query = query.filter(MaintenanceRecord.service_date >= fromDate)
    if toDate:
        query = query.filter(MaintenanceRecord.service_date <= toDate)
    if search:
        like = f"%{search}%"
        query = query.filter(
            (MaintenanceRecord.title.ilike(like))
            | (MaintenanceRecord.shop_name.ilike(like))
            | (MaintenanceRecord.notes.ilike(like))
        )

    records = query.all()
    return [MaintenanceOut.model_validate(rec) for rec in records]


@router.post("/records", response_model=MaintenanceOut)
def create_record(
    payload: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = ensure_vehicle(payload.vehicle_id, current_user, db)

    record = MaintenanceRecord(
        user_id=current_user.id,
        vehicle_id=vehicle.id,
        service_date=payload.service_date,
        title=payload.title,
        service_type=payload.service_type,
        cost=payload.cost,
        odometer_km=payload.odometer_km,
        shop_name=payload.shop_name,
        notes=payload.notes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return MaintenanceOut.model_validate(record)


@router.put("/records/{record_id}", response_model=MaintenanceOut)
def update_record(
    payload: MaintenanceUpdate,
    record_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = (
        db.query(MaintenanceRecord)
        .filter(MaintenanceRecord.id == record_id, MaintenanceRecord.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Maintenance record not found")

    if payload.service_date is not None:
        record.service_date = payload.service_date
    if payload.title is not None:
        record.title = payload.title
    if payload.service_type is not None:
        record.service_type = payload.service_type
    if payload.cost is not None:
        record.cost = payload.cost
    if payload.odometer_km is not None:
        record.odometer_km = payload.odometer_km
    if payload.shop_name is not None:
        record.shop_name = payload.shop_name
    if payload.notes is not None:
        record.notes = payload.notes
    db.add(record)
    db.commit()
    db.refresh(record)
    return MaintenanceOut.model_validate(record)


@router.delete("/records/{record_id}")
def delete_record(
    record_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = (
        db.query(MaintenanceRecord)
        .filter(MaintenanceRecord.id == record_id, MaintenanceRecord.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Maintenance record not found")

    db.delete(record)
    db.commit()
    return {"ok": True}


@router.get("/overview", response_model=MaintenanceOverview)
def maintenance_overview(
    vehicleId: int = Query(..., alias="vehicleId"),
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_vehicle(vehicleId, current_user, db)

    today = date.today()
    target_year = year or today.year
    target_month = month or today.month

    start_date = date(target_year, target_month, 1)
    if target_month == 12:
        end_date = date(target_year + 1, 1, 1)
    else:
        end_date = date(target_year, target_month + 1, 1)

    base_query = db.query(MaintenanceRecord).filter(MaintenanceRecord.vehicle_id == vehicleId)
    month_query = base_query.filter(
        MaintenanceRecord.service_date >= start_date,
        MaintenanceRecord.service_date < end_date,
    )
    total_cost_month = (
        month_query.with_entities(func.coalesce(func.sum(MaintenanceRecord.cost), 0)).scalar()
    )
    total_count_month = month_query.count()
    scheduled_count_month = month_query.filter(MaintenanceRecord.service_type == "scheduled").count()
    unscheduled_count_month = month_query.filter(MaintenanceRecord.service_type == "unscheduled").count()

    last_service = base_query.order_by(MaintenanceRecord.service_date.desc()).first()
    recent = (
        base_query.order_by(MaintenanceRecord.service_date.desc(), MaintenanceRecord.created_at.desc())
        .limit(5)
        .all()
    )

    overview = MaintenanceOverview(
        vehicle_id=vehicleId,
        total_cost_month=Decimal(total_cost_month or 0),
        total_count_month=total_count_month,
        scheduled_count_month=scheduled_count_month,
        unscheduled_count_month=unscheduled_count_month,
        last_service_date=last_service.service_date if last_service else None,
        recent=[MaintenanceOut.model_validate(item) for item in recent],
    )
    return overview
