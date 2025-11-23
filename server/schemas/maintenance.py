from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field


class MaintenanceBase(BaseModel):
    service_date: date
    title: str
    service_type: str
    cost: Decimal = Field(default=0)
    odometer_km: Optional[int] = None
    shop_name: Optional[str] = None
    notes: Optional[str] = None


class MaintenanceCreate(MaintenanceBase):
    vehicle_id: int


class MaintenanceUpdate(BaseModel):
    service_date: Optional[date] = None
    title: Optional[str] = None
    service_type: Optional[str] = None
    cost: Optional[Decimal] = None
    odometer_km: Optional[int] = None
    shop_name: Optional[str] = None
    notes: Optional[str] = None


class MaintenanceOut(MaintenanceBase):
    id: int
    vehicle_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MaintenanceOverview(BaseModel):
    vehicle_id: int
    total_cost_month: Decimal
    total_count_month: int
    scheduled_count_month: int
    unscheduled_count_month: int
    last_service_date: Optional[date]
    recent: List[MaintenanceOut]
