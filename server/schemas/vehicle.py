from pydantic import BaseModel
from typing import Optional
from schemas.common import ORMBase

class VehicleCreate(BaseModel):
    plate_no: str
    maker: Optional[str] = None
    makerType: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    odo_km: Optional[int] = 0
    owner_name: Optional[str] = None
    displacement_cc: Optional[int] = None   # 🚗 신규 추가 필드 (배기량 cc)


class VehicleOut(ORMBase):
    id: int
    plate_no: str
    maker: str | None = None
    model: str | None = None
    makerType: Optional[str] = None
    year: int | None = None
    odo_km: int | None = 0
    insurance_exp: None | str = None
    insp_exp: None | str = None
    owner_name: str | None = None
