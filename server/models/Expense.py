from sqlalchemy import Column, Integer, String, Date, ForeignKey, Numeric
from db.session import Base

class Expense(Base):
    __tablename__ = "expenses"
    id = Column(Integer, primary_key=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), index=True, nullable=False)
    date = Column(Date, nullable=False)
    type = Column(String(32), nullable=False)  # 보험/세금/정비비 등
    amount = Column(Numeric(12,2), default=0)
    memo = Column(String(255))
