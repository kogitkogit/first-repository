import logging
from urllib.parse import urlparse

from pathlib import Path

from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session

from api import ai_dashboard, auth, charging, consumables, expenses, fuel, legal, maintenance, notifications, odometer, tires, vehicles
from core.config import settings
from core.security import verify_password
from db.instrumentation import begin_request, end_request, setup_db_timing_logging
from db.session import engine, get_db
from models.User import User

BASE_DIR = Path(__file__).resolve().parent
IMAGES_DIR = BASE_DIR / "images"
PRIVACY_POLICY_PATH = BASE_DIR / "privacy_policy_public.html"
BACKUP_POLICY_PATH = BASE_DIR / "backup_recovery_policy_public.html"
ACCOUNT_DELETION_PATH = BASE_DIR / "account_deletion_public.html"

IMAGES_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI()
logger = logging.getLogger("carcare.app")


def load_privacy_policy_html() -> str:
    return PRIVACY_POLICY_PATH.read_text(encoding="utf-8")


def load_backup_policy_html() -> str:
    return BACKUP_POLICY_PATH.read_text(encoding="utf-8")


def load_account_deletion_html() -> str:
    return ACCOUNT_DELETION_PATH.read_text(encoding="utf-8")


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
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
app.include_router(charging.router, prefix="/api/charging", tags=["charging"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(legal.router, prefix="/api/legal", tags=["legal"])
app.include_router(ai_dashboard.router, prefix="/api/ai_dashboard", tags=["ai_dashboard"])
app.include_router(odometer.router, prefix="/api/odometer", tags=["odometer"])
app.include_router(tires.router, prefix="/api")
setup_db_timing_logging(engine)


def _extract_db_region_hint() -> str:
    host = urlparse(settings.DATABASE_URL).hostname or ""
    for part in host.split("."):
        if part.count("-") >= 2 and any(char.isdigit() for char in part):
            return part
    return ""


@app.on_event("startup")
def startup_diagnostics():
    app_region = settings.APP_REGION_HINT.strip()
    db_region = _extract_db_region_hint()
    if app_region and db_region and app_region != db_region:
        logger.warning("region_mismatch app_region=%s db_region=%s", app_region, db_region)
    elif db_region:
        logger.info("db_region_hint=%s", db_region)


@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    begin_request(request.url.path)
    response = await call_next(request)
    end_request(response.status_code)
    return response


@app.get("/api/health")
def health_check():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"ok": True}


@app.get("/api/ping")
def ping():
    return {"ok": True, "service": "awake"}


@app.get("/privacy-policy", response_class=HTMLResponse, include_in_schema=False)
def privacy_policy_page():
    return load_privacy_policy_html()


@app.get("/backup-recovery-policy", response_class=HTMLResponse, include_in_schema=False)
def backup_recovery_policy_page():
    return load_backup_policy_html()


@app.get("/account-deletion", response_class=HTMLResponse, include_in_schema=False)
def account_deletion_page():
    return load_account_deletion_html()


@app.post("/account-deletion/request", response_class=JSONResponse, include_in_schema=False)
def account_deletion_request(payload: dict, db: Session = Depends(get_db)):
    username = str(payload.get("username") or "").strip()
    password = str(payload.get("password") or "")

    if not username or not password:
        raise HTTPException(status_code=400, detail="아이디와 비밀번호를 모두 입력해주세요.")

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="일치하는 계정을 찾을 수 없습니다.")

    if auth.account_type_for(user) == "guest":
        raise HTTPException(
            status_code=400,
            detail="비회원 시작 계정은 이 페이지에서 바로 삭제할 수 없습니다. 앱 내부 설정 화면에서 삭제를 진행해주세요.",
        )

    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")

    auth.delete_user_account(db, user)
    return {"ok": True, "message": "계정 및 관련 데이터 삭제가 완료되었습니다."}


app.mount("/images", StaticFiles(directory=str(IMAGES_DIR)), name="images")
