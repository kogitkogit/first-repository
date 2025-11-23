from pydantic import BaseModel
from datetime import date

class OdometerUpdate(BaseModel):
    vehicleId: int
    date: date
    odo_km: int

    class Config:
        from_attributes = True
