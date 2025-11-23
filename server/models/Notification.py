from sqlalchemy import Column, Integer, String, Date, ForeignKey, Boolean
from db.session import Base

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), index=True, nullable=False)
    type = Column(String(32))  # "oil", "filter", "consumable" 등
    due_date = Column(Date, nullable=True)
    due_odo = Column(Integer, nullable=True)
    sent_at = Column(Date, nullable=True)
    enabled = Column(Boolean, default=True)  # 알림 설정 여부 추가
