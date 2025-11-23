from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from db.session import Base

class CarModel(Base):
    __tablename__ = "car_models"

    id = Column(Integer, primary_key=True, index=True)
    maker_id = Column(Integer, ForeignKey("car_makers.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)

    maker = relationship("CarMaker", back_populates="models")
    displacement_cc = Column(Integer, nullable=True)
