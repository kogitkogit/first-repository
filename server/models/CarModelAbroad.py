from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from db.session import Base

class CarModelAbroad(Base):
    __tablename__ = "car_models_abroad"

    id = Column(Integer, primary_key=True, index=True)
    maker_id = Column(Integer, ForeignKey("car_makers_abroad.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)

    maker = relationship("CarMakerAbroad", back_populates="models")
    displacement_cc = Column(Integer, nullable=True)
