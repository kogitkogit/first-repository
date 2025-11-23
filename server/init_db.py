# server/init_db.py
from db.session import Base, engine

# models 패키지에서 모든 모델 import (필수!)
from models import CarMaker, CarMakerAbroad, CarModel, CarModelAbroad, ConsumableItem, Expense, FuelRecord, MaintenanceRecord, Notification, User, Vehicle
def init():
    print("▶ Creating tables in database...")
    Base.metadata.create_all(bind=engine)
    print("✅ Done.")

if __name__ == "__main__":
    init()