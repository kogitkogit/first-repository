from enum import Enum
from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from db.session import Base


class TirePosition(str, Enum):
    FRONT_LEFT = "front_left"
    FRONT_RIGHT = "front_right"
    REAR_LEFT = "rear_left"
    REAR_RIGHT = "rear_right"

    @property
    def label(self) -> str:
        return {
            "front_left": "Front Left",
            "front_right": "Front Right",
            "rear_left": "Rear Left",
            "rear_right": "Rear Right",
        }[self.value]


class VehicleTire(Base):
    __tablename__ = "vehicle_tires"
    __table_args__ = (
        UniqueConstraint("vehicle_id", "position", name="uq_vehicle_tire_position"),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False, index=True)
    position = Column(String(16), nullable=False, index=True)
    brand = Column(String(64), nullable=True)
    model = Column(String(64), nullable=True)
    size = Column(String(64), nullable=True)
    dot_code = Column(String(32), nullable=True)
    installed_at = Column(Date, nullable=True)
    installed_odo = Column(Integer, nullable=True)
    recommended_pressure_min = Column(Float, nullable=True)
    recommended_pressure_max = Column(Float, nullable=True)
    pressure_unit = Column(String(8), nullable=False, default="kPa")
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    vehicle = relationship("Vehicle", back_populates="tires")
    measurements = relationship("TireMeasurement", back_populates="tire", cascade="all, delete-orphan")
    service_records = relationship("TireServiceRecord", back_populates="tire", cascade="all, delete-orphan")


class TireMeasurement(Base):
    __tablename__ = "tire_measurements"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False, index=True)
    tire_id = Column(Integer, ForeignKey("vehicle_tires.id"), nullable=False, index=True)
    measured_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    pressure_kpa = Column(Float, nullable=True)
    tread_depth_mm = Column(Float, nullable=True)
    temperature_c = Column(Float, nullable=True)
    measured_by = Column(String(64), nullable=True)
    location = Column(String(64), nullable=True)
    notes = Column(String(255), nullable=True)

    tire = relationship("VehicleTire", back_populates="measurements")


class TireServiceRecord(Base):
    __tablename__ = "tire_service_records"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False, index=True)
    tire_id = Column(Integer, ForeignKey("vehicle_tires.id"), nullable=True, index=True)
    positions = Column(String(64), nullable=True)
    service_type = Column(String(32), nullable=False)
    performed_at = Column(Date, nullable=False)
    odo_km = Column(Integer, nullable=True)
    provider = Column(String(64), nullable=True)
    cost = Column(Integer, nullable=True)
    pattern = Column(String(64), nullable=True)
    brand = Column(String(64), nullable=True)
    model = Column(String(64), nullable=True)
    size = Column(String(64), nullable=True)
    dot_code = Column(String(32), nullable=True)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    tire = relationship("VehicleTire", back_populates="service_records")
