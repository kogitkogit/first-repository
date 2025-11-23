from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from db.session import Base


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    plate_no = Column(String(32), index=True, nullable=False)
    maker = Column(String(64))
    model = Column(String(64))
    makerType = Column(String(64))
    year = Column(Integer)
    odo_km = Column(Integer, default=0)
    insurance_exp = Column(Date)
    insp_exp = Column(Date)
    owner_name = Column(String(64))

    user = relationship("User", back_populates="vehicles")
    fuel_records = relationship("FuelRecord", back_populates="vehicle", cascade="all, delete-orphan")
    tires = relationship("VehicleTire", back_populates="vehicle", cascade="all, delete-orphan")
