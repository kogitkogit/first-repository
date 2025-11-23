from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from db.session import Base

class CarMakerAbroad(Base):
    __tablename__ = "car_makers_abroad"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)

    models = relationship("CarModelAbroad", back_populates="maker", cascade="all, delete-orphan")
