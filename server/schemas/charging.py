from typing import Optional

from pydantic import BaseModel

from schemas.common import ORMBase


class ChargingCreate(BaseModel):
    vehicle_id: int
    date: str
    energy_kwh: float
    price_total: float
    odo_km: int
    charge_type: Optional[str] = None
    battery_before_percent: Optional[int] = None
    battery_after_percent: Optional[int] = None


class ChargingOut(ORMBase):
    id: int
    vehicle_id: int
    date: str
    energy_kwh: float
    price_total: float
    odo_km: int
    charge_type: Optional[str] = None
    battery_before_percent: Optional[int] = None
    battery_after_percent: Optional[int] = None
