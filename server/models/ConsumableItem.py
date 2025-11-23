from sqlalchemy import Column, Integer, String, Date, ForeignKey, Boolean, DateTime
from db.session import Base
from datetime import datetime

# History table: public.consumables
class Consumable(Base):
    __tablename__ = "consumables"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    category = Column(String, index=True)    # 오일/필터/타이어/소모품 등
    kind = Column(String, index=True)        # 엔진오일 등
    date = Column(Date, nullable=True)       # 교체일
    odo_km = Column(Integer, nullable=True)  # 교체 당시 주행거리
    cycle_km = Column(Integer, nullable=True)
    cycle_months = Column(Integer, nullable=True)
    cost = Column(Integer, nullable=True)
    memo = Column(String, nullable=True)

# Settings table: public.consumable_items
class ConsumableItem(Base):
    __tablename__ = "consumable_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    category = Column(String, index=True)    # 오일/필터/타이어/소모품 등
    kind = Column(String, index=True)        # 엔진오일/미션오일 등
    mode = Column(String, nullable=True)     # distance | time
    cycle_km = Column(Integer, nullable=True)
    cycle_months = Column(Integer, nullable=True)
    last_date = Column(Date, nullable=True)      # 마지막 교체일 (싱크용)
    last_odo_km = Column(Integer, nullable=True) # 마지막 교체 주행거리 (싱크용)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)