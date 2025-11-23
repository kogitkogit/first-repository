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
    warnings: List[str] = []
    status = "ok"
    pressure_unit = tire.pressure_unit if tire and tire.pressure_unit else "kPa"
    today = date.today()

    if tire is None:
        warnings.append("No tire metadata registered yet.")
        status = escalate_status(status, "warning")
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
            notes=None,
            status=status,
            warnings=warnings,
            last_measurement=None,
            last_service=None,
        )

    measurement_out = None
    if last_measurement:
        measure_dt = to_utc_naive(last_measurement.measured_at)
        if measure_dt:
            days_since = (datetime.utcnow() - measure_dt).days
            if days_since > 45:
                warnings.append("Last pressure check was over 45 days ago.")
                status = escalate_status(status, "warning")
        else:
            warnings.append("Measurement timestamp missing.")
            status = escalate_status(status, "warning")

        pressure = last_measurement.pressure_kpa
        if pressure is not None and tire.recommended_pressure_min:
            target_min = tire.recommended_pressure_min
            target_max = tire.recommended_pressure_max or target_min
            upper_soft = target_max * 1.1
            lower_soft = target_min * 0.9
            if pressure < lower_soft or pressure > upper_soft:
                warnings.append("Pressure is far outside the recommended range.")
                status = escalate_status(status, "critical")
            elif pressure < target_min or pressure > target_max:
                warnings.append("Pressure is outside the recommended range.")
                status = escalate_status(status, "warning")

        depth = last_measurement.tread_depth_mm
        if depth is not None:
            if depth <= 2.0:
                warnings.append("Tread depth is at or below 2mm. Replace immediately.")
                status = escalate_status(status, "critical")
            elif depth <= 3.0:
                warnings.append("Tread depth is at or below 3mm. Plan a replacement soon.")
                status = escalate_status(status, "warning")

        measurement_out = TireMeasurementOut.model_validate(last_measurement)
    else:
        warnings.append("No pressure measurement recorded yet.")
        status = escalate_status(status, "warning")

    if tire.installed_at and (today - tire.installed_at).days > 5 * 365:
        warnings.append("Tire has been in service for more than 5 years.")
        status = escalate_status(status, "warning")

    if tire.installed_odo is not None and vehicle.odo_km is not None:
        distance = vehicle.odo_km - tire.installed_odo
        if distance > 60000:
            warnings.append("Tire has covered more than 60,000 km since installation.")
            status = escalate_status(status, "warning")

    service_out = (
        TireServiceRecordOut.model_validate(last_service) if last_service else None
    )

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
        notes=tire.notes,
        status=status,
        warnings=warnings,
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



