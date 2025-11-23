from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api import auth, vehicles, maintenance, consumables, expenses, fuel, notifications, ai_dashboard, odometer, tires, legal

IMAGES_DIR = Path(__file__).resolve().parent / "images"
IMAGES_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(vehicles.router, prefix="/api/vehicles")
app.include_router(maintenance.router, prefix="/api/maintenance", tags=["maintenance"])
app.include_router(consumables.router, prefix="/api/consumables", tags=["consumables"])
app.include_router(expenses.router, prefix="/api/expenses", tags=["expenses"])
app.include_router(fuel.router, prefix="/api/fuel", tags=["fuel"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(legal.router, prefix="/api/legal", tags=["legal"])
app.include_router(ai_dashboard.router, prefix="/api/ai_dashboard", tags=["ai_dashboard"])
app.include_router(odometer.router, prefix="/api/odometer", tags=["odometer"])
app.include_router(tires.router, prefix="/api")

app.mount("/images", StaticFiles(directory=str(IMAGES_DIR)), name="images")
