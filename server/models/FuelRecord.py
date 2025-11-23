from sqlalchemy import Column, Integer, Date, ForeignKey, Numeric, Boolean
from sqlalchemy.orm import relationship
from db.session import Base

class FuelRecord(Base):
    __tablename__ = "fuel_records"
    id = Column(Integer, primary_key=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), index=True, nullable=False)
    date = Column(Date, nullable=False)
    liters = Column(Numeric(10,3), nullable=False)
    price_total = Column(Numeric(12,2), nullable=False)
    odo_km = Column(Integer, nullable=False)
    is_full = Column(Boolean, default=True)  # 만땅 여부
    vehicle = relationship("Vehicle", back_populates="fuel_records")
