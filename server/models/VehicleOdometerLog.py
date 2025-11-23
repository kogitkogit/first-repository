from sqlalchemy import Column, Integer, Date, ForeignKey, TIMESTAMP, func
from sqlalchemy.orm import relationship
from db.session import Base

class VehicleOdometerLog(Base):
    __tablename__ = "vehicle_odometer_logs"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False)
    odo_km = Column(Integer, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    vehicle = relationship("Vehicle", backref="odometer_logs")
