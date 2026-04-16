from datetime import date, datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session

from core.auth import get_current_user
from db.session import get_db
from models.User import User
from models.Vehicle import Vehicle
from models.Tire import TireMeasurement, TirePosition, TireServiceRecord, VehicleTire
from schemas.tires import (
    TireHistoryResponse,
    TireMeasurementCreate,
    TireMeasurementOut,
    TireMetaUpdate,
    TireReplacementCreate,
    TireRotationCreate,
    TireServiceRecordOut,
    TireSummaryItem,
    TireSummaryResponse,
)

router = APIRouter(prefix="/tires", tags=["tires"])

STATUS_ORDER = {"ok": 0, "warning": 1, "critical": 2}
POSITION_ORDER = [pos for pos in TirePosition]
PRESSURE_CHECK_WARN_DAYS = 45
TIRE_AGE_WARN_DAYS = 5 * 365
TIRE_DISTANCE_WARN_KM = 60000
TIRE_AGE_WARN_YEARS = 5


def ensure_vehicle(vehicle_id: int, user: User, db: Session) -> Vehicle:
    vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.id == vehicle_id, Vehicle.user_id == user.id)
        .first()
    )
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle


def get_or_create_tire(
    vehicle: Vehicle,
    position: TirePosition,
    db: Session,
    create: bool = False,
) -> Optional[VehicleTire]:
    tire = (
        db.query(VehicleTire)
        .filter(VehicleTire.vehicle_id == vehicle.id, VehicleTire.position == position.value)
        .first()
    )
    if tire:
        return tire
    if not create:
        return None
    tire = VehicleTire(
        user_id=vehicle.user_id,
        vehicle_id=vehicle.id,
        position=position.value,
        pressure_unit="kPa",
    )
    db.add(tire)
    db.commit()
    db.refresh(tire)
    return tire


def escalate_status(current: str, candidate: str) -> str:
    if STATUS_ORDER[candidate] > STATUS_ORDER[current]:
        return candidate
    return current


def to_utc_naive(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def compute_summary_item(
    vehicle: Vehicle,
    position: TirePosition,
    tire: Optional[VehicleTire],
    last_measurement: Optional[TireMeasurement],
    last_service: Optional[TireServiceRecord],
) -> TireSummaryItem:
    missing_items: List[str] = []
    warnings: List[str] = []
    critical_items: List[str] = []
    pressure_unit = tire.pressure_unit if tire and tire.pressure_unit else "kPa"
    today = date.today()
    pressure_check_warn_days = tire.pressure_check_interval_days if tire and tire.pressure_check_interval_days else PRESSURE_CHECK_WARN_DAYS
    age_limit_years = tire.age_limit_years if tire and tire.age_limit_years else TIRE_AGE_WARN_YEARS
    age_warn_days = age_limit_years * 365
    distance_warn_km = tire.distance_limit_km if tire and tire.distance_limit_km else TIRE_DISTANCE_WARN_KM

    if tire is None:
        return TireSummaryItem(
            position=position.value,
            position_label=position.label,
            brand=None,
            model=None,
            size=None,
            dot_code=None,
            installed_at=None,
            installed_odo=None,
            recommended_pressure_min=None,
            recommended_pressure_max=None,
            pressure_unit=pressure_unit,
            pressure_check_interval_days=PRESSURE_CHECK_WARN_DAYS,
            age_limit_years=TIRE_AGE_WARN_YEARS,
            distance_limit_km=TIRE_DISTANCE_WARN_KM,
            notes=None,
            status="missing",
            warnings=["No tire metadata registered yet."],
            next_action="타이어 기본 정보를 먼저 입력하세요.",
            last_measurement=None,
            last_service=None,
        )

    measurement_out = None
    if last_measurement:
        measure_dt = to_utc_naive(last_measurement.measured_at)
        if measure_dt:
            days_since = (datetime.utcnow() - measure_dt).days
            if days_since > pressure_check_warn_days:
                warnings.append(f"Last pressure check was over {pressure_check_warn_days} days ago.")
        else:
            missing_items.append("Measurement timestamp missing.")

        pressure = last_measurement.pressure_kpa
        if pressure is not None and tire.recommended_pressure_min:
            target_min = tire.recommended_pressure_min
            target_max = tire.recommended_pressure_max or target_min
            upper_soft = target_max * 1.1
            lower_soft = target_min * 0.9
            if pressure < lower_soft or pressure > upper_soft:
                critical_items.append("Pressure is far outside the recommended range.")
            elif pressure < target_min or pressure > target_max:
                warnings.append("Pressure is outside the recommended range.")

        depth = last_measurement.tread_depth_mm
        if depth is not None:
            if depth <= 2.0:
                critical_items.append("Tread depth is at or below 2mm. Replace immediately.")
            elif depth <= 3.0:
                warnings.append("Tread depth is at or below 3mm. Plan a replacement soon.")

        measurement_out = TireMeasurementOut.model_validate(last_measurement)
    else:
        missing_items.append("No pressure measurement recorded yet.")

    if tire.installed_at and (today - tire.installed_at).days > age_warn_days:
        warnings.append(f"Tire has been in service for more than {age_limit_years} years.")

    if tire.installed_odo is not None and vehicle.odo_km is not None:
        distance = vehicle.odo_km - tire.installed_odo
        if distance > distance_warn_km:
            warnings.append(f"Tire has covered more than {distance_warn_km:,} km since installation.")

    service_out = (
        TireServiceRecordOut.model_validate(last_service) if last_service else None
    )

    all_messages = [*critical_items, *warnings, *missing_items]
    if critical_items:
        status = "critical"
    elif warnings:
        status = "warning"
    elif missing_items:
        status = "missing"
    else:
        status = "ok"

    pressure_warning_present = any(
        message.startswith("Pressure is outside the recommended range.")
        or message.startswith("Last pressure check was over ")
        for message in warnings
    )
    lifecycle_warning_present = any(
        message.startswith("Tire has covered more than ")
        or message.startswith("Tire has been in service for more than ")
        for message in warnings
    )

    if critical_items:
        next_action = "타이어 교체 또는 정비가 필요합니다. 상세 기록을 확인하세요."
    elif pressure_warning_present:
        next_action = "공기압을 다시 점검하고 최신 계측값을 기록하세요."
    elif lifecycle_warning_present:
        next_action = "타이어 상태를 점검하고 교체 시기를 확인하세요."
    elif "Measurement timestamp missing." in missing_items or "No pressure measurement recorded yet." in missing_items:
        next_action = "계측값을 먼저 기록하세요."
    elif "No tire metadata registered yet." in missing_items:
        next_action = "타이어 기본 정보를 먼저 입력하세요."
    else:
        next_action = None

    return TireSummaryItem(
        position=position.value,
        position_label=position.label,
        brand=tire.brand,
        model=tire.model,
        size=tire.size,
        dot_code=tire.dot_code,
        installed_at=tire.installed_at,
        installed_odo=tire.installed_odo,
        recommended_pressure_min=tire.recommended_pressure_min,
        recommended_pressure_max=tire.recommended_pressure_max,
        pressure_unit=pressure_unit,
        pressure_check_interval_days=pressure_check_warn_days,
        age_limit_years=age_limit_years,
        distance_limit_km=distance_warn_km,
        notes=tire.notes,
        status=status,
        warnings=all_messages,
        next_action=next_action,
        last_measurement=measurement_out,
        last_service=service_out,
    )


@router.get("/summary", response_model=TireSummaryResponse)
def get_tire_summary(
    vehicleId: int = Query(..., alias="vehicleId"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = ensure_vehicle(vehicleId, current_user, db)

    tires = (
        db.query(VehicleTire)
        .filter(VehicleTire.vehicle_id == vehicle.id)
        .all()
    )
    tire_map: Dict[str, VehicleTire] = {t.position: t for t in tires}

    summary_items: List[TireSummaryItem] = []
    for position in POSITION_ORDER:
        tire = tire_map.get(position.value)
        last_measurement = None
        last_service = None
        if tire:
            last_measurement = (
                db.query(TireMeasurement)
                .filter(TireMeasurement.tire_id == tire.id)
                .order_by(TireMeasurement.measured_at.desc())
                .first()
            )
            last_service = (
                db.query(TireServiceRecord)
                .filter(TireServiceRecord.tire_id == tire.id)
                .order_by(TireServiceRecord.performed_at.desc())
                .first()
            )
        summary_items.append(
            compute_summary_item(vehicle, position, tire, last_measurement, last_service)
        )

    recent_services = (
        db.query(TireServiceRecord)
        .filter(TireServiceRecord.vehicle_id == vehicle.id)
        .order_by(TireServiceRecord.performed_at.desc())
        .limit(10)
        .all()
    )

    recent_out = [TireServiceRecordOut.model_validate(s) for s in recent_services]

    return TireSummaryResponse(vehicle_id=vehicle.id, tires=summary_items, recent_services=recent_out)


@router.get("/{position}/history", response_model=TireHistoryResponse)
def get_tire_history(
    position: str = Path(...),
    vehicleId: int = Query(..., alias="vehicleId"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = ensure_vehicle(vehicleId, current_user, db)
    try:
        pos_enum = TirePosition(position)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tire position")

    tire = get_or_create_tire(vehicle, pos_enum, db, create=True)

    measurements = (
        db.query(TireMeasurement)
        .filter(TireMeasurement.tire_id == tire.id)
        .order_by(TireMeasurement.measured_at.desc())
        .all()
    )

    services = (
        db.query(TireServiceRecord)
        .filter(TireServiceRecord.tire_id == tire.id)
        .order_by(TireServiceRecord.performed_at.desc())
        .all()
    )

    summary_item = compute_summary_item(
        vehicle,
        pos_enum,
        tire,
        measurements[0] if measurements else None,
        services[0] if services else None,
    )

    measurement_out = [TireMeasurementOut.model_validate(m) for m in measurements]
    service_out = [TireServiceRecordOut.model_validate(s) for s in services]

    return TireHistoryResponse(tire=summary_item, measurements=measurement_out, services=service_out)


@router.put("/{position}", response_model=TireSummaryItem)
def update_tire_meta(
    payload: TireMetaUpdate,
    position: str = Path(...),
    vehicleId: int = Query(..., alias="vehicleId"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = ensure_vehicle(vehicleId, current_user, db)
    try:
        pos_enum = TirePosition(position)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tire position")

    tire = get_or_create_tire(vehicle, pos_enum, db, create=True)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(tire, field, value)
    db.add(tire)
    db.commit()
    db.refresh(tire)

    last_measurement = (
        db.query(TireMeasurement)
        .filter(TireMeasurement.tire_id == tire.id)
        .order_by(TireMeasurement.measured_at.desc())
        .first()
    )
    last_service = (
        db.query(TireServiceRecord)
        .filter(TireServiceRecord.tire_id == tire.id)
        .order_by(TireServiceRecord.performed_at.desc())
        .first()
    )

    return compute_summary_item(vehicle, pos_enum, tire, last_measurement, last_service)


@router.delete("/{position}/meta", response_model=TireSummaryItem)
def reset_tire_meta(
    position: str = Path(...),
    vehicleId: int = Query(..., alias="vehicleId"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = ensure_vehicle(vehicleId, current_user, db)
    try:
        pos_enum = TirePosition(position)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tire position")

    tire = get_or_create_tire(vehicle, pos_enum, db, create=True)
    for field in [
        "brand",
        "model",
        "size",
        "dot_code",
        "installed_at",
        "installed_odo",
        "recommended_pressure_min",
        "recommended_pressure_max",
        "pressure_check_interval_days",
        "age_limit_years",
        "distance_limit_km",
        "notes",
    ]:
        setattr(tire, field, None)
    tire.pressure_unit = "kPa"
    db.add(tire)
    db.commit()
    db.refresh(tire)

    last_measurement = (
        db.query(TireMeasurement)
        .filter(TireMeasurement.tire_id == tire.id)
        .order_by(TireMeasurement.measured_at.desc())
        .first()
    )
    last_service = (
        db.query(TireServiceRecord)
        .filter(TireServiceRecord.tire_id == tire.id)
        .order_by(TireServiceRecord.performed_at.desc())
        .first()
    )
    return compute_summary_item(vehicle, pos_enum, tire, last_measurement, last_service)


@router.post("/{position}/measurements", response_model=TireMeasurementOut)
def create_tire_measurement(
    payload: TireMeasurementCreate,
    position: str = Path(...),
    vehicleId: int = Query(..., alias="vehicleId"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = ensure_vehicle(vehicleId, current_user, db)
    try:
        pos_enum = TirePosition(position)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tire position")

    tire = get_or_create_tire(vehicle, pos_enum, db, create=True)

    measured_at = payload.measured_at or datetime.now(timezone.utc)
    measured_date = measured_at.date() if hasattr(measured_at, "date") else None
    if measured_date and measured_date > date.today():
        raise HTTPException(status_code=400, detail="올바른 날짜를 선택해주세요.")

    measurement = TireMeasurement(
        user_id=current_user.id,
        vehicle_id=vehicle.id,
        tire_id=tire.id,
        measured_at=measured_at,
        pressure_kpa=payload.pressure_kpa,
        tread_depth_mm=payload.tread_depth_mm,
        temperature_c=payload.temperature_c,
        measured_by=payload.measured_by,
        location=payload.location,
        notes=payload.notes,
    )
    db.add(measurement)
    db.commit()
    db.refresh(measurement)
    return TireMeasurementOut.model_validate(measurement)


@router.put("/{position}/measurements/{measurement_id}", response_model=TireMeasurementOut)
def update_tire_measurement(
    payload: TireMeasurementCreate,
    measurement_id: int,
    position: str = Path(...),
    vehicleId: int = Query(..., alias="vehicleId"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = ensure_vehicle(vehicleId, current_user, db)
    try:
        pos_enum = TirePosition(position)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tire position")

    tire = get_or_create_tire(vehicle, pos_enum, db, create=True)
    measurement = (
        db.query(TireMeasurement)
        .filter(
            TireMeasurement.id == measurement_id,
            TireMeasurement.vehicle_id == vehicle.id,
            TireMeasurement.tire_id == tire.id,
        )
        .first()
    )
    if not measurement:
        raise HTTPException(status_code=404, detail="Measurement not found")

    measured_at = payload.measured_at or measurement.measured_at
    measured_date = measured_at.date() if hasattr(measured_at, "date") else None
    if measured_date and measured_date > date.today():
        raise HTTPException(status_code=400, detail="올바른 날짜를 선택해주세요.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(measurement, field, value)
    measurement.measured_at = measured_at
    db.add(measurement)
    db.commit()
    db.refresh(measurement)
    return TireMeasurementOut.model_validate(measurement)


@router.delete("/{position}/measurements/{measurement_id}")
def delete_tire_measurement(
    measurement_id: int,
    position: str = Path(...),
    vehicleId: int = Query(..., alias="vehicleId"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = ensure_vehicle(vehicleId, current_user, db)
    try:
        pos_enum = TirePosition(position)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tire position")
    tire = get_or_create_tire(vehicle, pos_enum, db, create=True)
    measurement = (
        db.query(TireMeasurement)
        .filter(
            TireMeasurement.id == measurement_id,
            TireMeasurement.vehicle_id == vehicle.id,
            TireMeasurement.tire_id == tire.id,
        )
        .first()
    )
    if not measurement:
        raise HTTPException(status_code=404, detail="Measurement not found")
    db.delete(measurement)
    db.commit()
    return {"ok": True}


@router.post("/{position}/replacement", response_model=TireServiceRecordOut)
def record_tire_replacement(
    payload: TireReplacementCreate,
    position: str = Path(...),
    vehicleId: int = Query(..., alias="vehicleId"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = ensure_vehicle(vehicleId, current_user, db)
    try:
        pos_enum = TirePosition(position)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tire position")

    tire = get_or_create_tire(vehicle, pos_enum, db, create=True)
    if payload.performed_at > date.today():
        raise HTTPException(status_code=400, detail="올바른 날짜를 선택해주세요.")

    field_values = payload.model_dump(exclude_unset=True)
    service_payload = {key: field_values.pop(key) for key in ["performed_at", "odo_km", "provider", "cost"] if key in field_values}

    for field, value in field_values.items():
        setattr(tire, field, value)
    db.add(tire)
    db.commit()
    db.refresh(tire)

    service = TireServiceRecord(
        user_id=current_user.id,
        vehicle_id=vehicle.id,
        tire_id=tire.id,
        positions=pos_enum.value,
        service_type="replacement",
        performed_at=service_payload.get("performed_at", payload.performed_at),
        odo_km=service_payload.get("odo_km"),
        provider=service_payload.get("provider"),
        cost=service_payload.get("cost"),
        brand=tire.brand,
        model=tire.model,
        size=tire.size,
        dot_code=tire.dot_code,
        notes=payload.notes,
    )
    db.add(service)
    db.commit()
    db.refresh(service)

    return TireServiceRecordOut.model_validate(service)


@router.post("/rotation", response_model=TireServiceRecordOut)
def record_rotation(
    payload: TireRotationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = ensure_vehicle(payload.vehicle_id, current_user, db)
    if payload.performed_at > date.today():
        raise HTTPException(status_code=400, detail="올바른 날짜를 선택해주세요.")

    service = TireServiceRecord(
        user_id=current_user.id,
        vehicle_id=vehicle.id,
        tire_id=None,
        positions="front_left,front_right,rear_left,rear_right",
        service_type="rotation",
        performed_at=payload.performed_at,
        odo_km=payload.odo_km,
        provider=payload.provider,
        cost=payload.cost,
        pattern=payload.pattern,
        notes=payload.notes,
    )
    db.add(service)
    db.commit()
    db.refresh(service)

    return TireServiceRecordOut.model_validate(service)


@router.get("/services", response_model=List[TireServiceRecordOut])
def list_service_records(
    vehicleId: int = Query(..., alias="vehicleId"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = ensure_vehicle(vehicleId, current_user, db)
    services = (
        db.query(TireServiceRecord)
        .filter(TireServiceRecord.vehicle_id == vehicle.id)
        .order_by(TireServiceRecord.performed_at.desc())
        .limit(limit)
        .all()
    )
    return [TireServiceRecordOut.model_validate(s) for s in services]



