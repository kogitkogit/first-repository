from pydantic import BaseModel
from typing import Optional
from schemas.common import ORMBase

class FuelCreate(BaseModel):
    vehicle_id: int
    date: str
    liters: float
    price_total: float
    odo_km: int
    is_full: bool = True

class FuelOut(ORMBase):
    id: int
    vehicle_id: int
    date: str
    liters: float
    price_total: float
    odo_km: int
    is_full: bool
