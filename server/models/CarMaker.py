from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from db.session import Base

class CarMaker(Base):
    __tablename__ = "car_makers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)

    models = relationship("CarModel", back_populates="maker", cascade="all, delete-orphan")
