from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# NOTE:
# - user_id 필드를 추가하여 사용자별 조회/저장을 지원합니다.
# - 기본 항목명과 설명은 한글을 유지하도록 구성되어 있습니다.

class ConsumableBase(BaseModel):
    user_id: Optional[int] = None
    vehicle_id: int
    category: Optional[str] = None
    kind: Optional[str] = None  # 예: 엔진오일/필터/와이퍼 등
    date: Optional[datetime] = None
    odo_km: Optional[int] = None
    cycle_km: Optional[int] = None
    cycle_months: Optional[int] = None
    cost: Optional[int] = None
    memo: Optional[str] = None

class ConsumableItemCreate(BaseModel):
    vehicle_id: int
    category: str
    kind: str
    mode: Optional[str] = "distance"
    cycle_km: Optional[int] = None
    cycle_months: Optional[int] = None
    last_odo_km: Optional[int] = None
    last_date: Optional[str] = None
    cost: Optional[int] = None
    memo: Optional[str] = None

class ConsumableCreate(ConsumableBase):
    pass  # post body 확장용 (현재는 ConsumableBase와 동일)

class Consumable(ConsumableBase):
    id: int
    category: Optional[str] = None

    class Config:
        from_attributes = True

class BulkDeleteRequest(BaseModel):
    ids: List[int]
