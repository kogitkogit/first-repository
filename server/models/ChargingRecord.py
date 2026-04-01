from sqlalchemy import Column, Date, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship

from db.session import Base


class ChargingRecord(Base):
    __tablename__ = "charging_records"

    id = Column(Integer, primary_key=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), index=True, nullable=False)
    date = Column(Date, nullable=False)
    energy_kwh = Column(Numeric(10, 3), nullable=False)
    price_total = Column(Numeric(12, 2), nullable=False)
    odo_km = Column(Integer, nullable=False)
    charge_type = Column(String(16))
    battery_before_percent = Column(Integer)
    battery_after_percent = Column(Integer)

    vehicle = relationship("Vehicle", back_populates="charging_records")
