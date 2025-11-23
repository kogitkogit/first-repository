from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class TireMeasurementCreate(BaseModel):
    measured_at: Optional[datetime] = Field(default=None, description="UTC timestamp of the measurement")
    pressure_kpa: Optional[float] = Field(default=None, description="Measured pressure in kPa")
    tread_depth_mm: Optional[float] = Field(default=None, description="Remaining tread depth in mm")
    temperature_c: Optional[float] = Field(default=None, description="Tire surface temperature")
    measured_by: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None


class TireMeasurementOut(TireMeasurementCreate):
    id: int
    measured_at: datetime

    class Config:
        from_attributes = True


class TireMetaUpdate(BaseModel):
    brand: Optional[str] = None
    model: Optional[str] = None
    size: Optional[str] = None
    dot_code: Optional[str] = None
    installed_at: Optional[date] = None
    installed_odo: Optional[int] = None
    recommended_pressure_min: Optional[float] = None
    recommended_pressure_max: Optional[float] = None
    pressure_unit: Optional[str] = None
    notes: Optional[str] = None


class TireReplacementCreate(TireMetaUpdate):
    performed_at: date
    odo_km: Optional[int] = None
    provider: Optional[str] = None
    cost: Optional[int] = None


class TireServiceRecordOut(BaseModel):
    id: int
    service_type: str
    performed_at: date
    odo_km: Optional[int] = None
    provider: Optional[str] = None
    cost: Optional[int] = None
    pattern: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    size: Optional[str] = None
    dot_code: Optional[str] = None
    notes: Optional[str] = None
    positions: Optional[str] = None

    class Config:
        from_attributes = True


class TireSummaryItem(BaseModel):
    position: str
    position_label: str
    brand: Optional[str] = None
    model: Optional[str] = None
    size: Optional[str] = None
    dot_code: Optional[str] = None
    installed_at: Optional[date] = None
    installed_odo: Optional[int] = None
    recommended_pressure_min: Optional[float] = None
    recommended_pressure_max: Optional[float] = None
    pressure_unit: str = "kPa"
    notes: Optional[str] = None
    status: str
    warnings: List[str]
    last_measurement: Optional[TireMeasurementOut] = None
    last_service: Optional[TireServiceRecordOut] = None


class TireSummaryResponse(BaseModel):
    vehicle_id: int
    tires: List[TireSummaryItem]
    recent_services: List[TireServiceRecordOut]


class TireHistoryResponse(BaseModel):
    tire: TireSummaryItem
    measurements: List[TireMeasurementOut]
    services: List[TireServiceRecordOut]


class TireRotationCreate(BaseModel):
    vehicle_id: int
    performed_at: date
    odo_km: Optional[int] = None
    pattern: Optional[str] = None
    provider: Optional[str] = None
    cost: Optional[int] = None
    notes: Optional[str] = None


class TireServiceDeleteRequest(BaseModel):
    ids: List[int]
