from pydantic import BaseModel
from typing import List


class OdometerDelete(BaseModel):
    vehicleId: int
    ids: List[int]

    class Config:
        from_attributes = True
