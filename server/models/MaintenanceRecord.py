from sqlalchemy import Column, Integer, String, Date, ForeignKey, Numeric, Text, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from db.session import Base


class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False, index=True)
    service_date = Column(Date, nullable=False, index=True)
    title = Column(String(120), nullable=False)
    service_type = Column(String(16), nullable=False, index=True)  # scheduled, unscheduled
    cost = Column(Numeric(12, 2), nullable=False, default=0)
    odometer_km = Column(Integer, nullable=True)
    shop_name = Column(String(120), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    vehicle = relationship("Vehicle", backref="maintenance_records")
