from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from api import auth, vehicles, maintenance, consumables, expenses, fuel, charging, notifications, ai_dashboard, odometer, tires, legal
from core.config import settings
from db.session import engine

IMAGES_DIR = Path(__file__).resolve().parent / "images"
IMAGES_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI()

PRIVACY_POLICY_HTML = """
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CarCare 개인정보처리방침</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: #f7f8fb; color: #1f2937; }
      main { max-width: 880px; margin: 0 auto; padding: 32px 20px 56px; }
      h1 { font-size: 28px; margin-bottom: 8px; }
      h2 { font-size: 18px; margin-top: 28px; margin-bottom: 10px; }
      p, li { line-height: 1.7; font-size: 15px; }
      .meta { color: #6b7280; font-size: 14px; }
      .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 18px; padding: 20px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06); }
      ul { padding-left: 20px; }
      a { color: #2563eb; }
    </style>
  </head>
  <body>
    <main>
      <div class="card">
        <h1>CarCare 개인정보처리방침</h1>
        <p class="meta">시행일: 2026-04-07</p>
        <h2>1. 개인정보 처리 목적</h2>
        <p>CarCare는 회원 식별, 차량 관리 서비스 제공, 정비 및 비용 기록 관리, 고객 문의 대응을 위해 개인정보를 처리합니다.</p>
        <h2>2. 수집하는 정보</h2>
        <ul>
          <li>이메일 또는 아이디, 비밀번호</li>
          <li>차량번호, 제조사, 모델, 연식, 배기량, 연료 타입, 주행거리</li>
          <li>정비, 주유, 충전, 소모품, 법적 서류, 비용, 메모 정보</li>
          <li>마케팅 수신 동의 여부</li>
        </ul>
        <h2>3. 보관 기간</h2>
        <p>회원 탈퇴 시까지 보관하며, 관련 법령에 따라 별도 보관이 필요한 경우에는 해당 기간 동안만 보관합니다.</p>
        <h2>4. 제3자 제공 및 외부 서비스</h2>
        <p>법령상 근거가 있거나 이용자 동의가 있는 경우를 제외하고 개인정보를 외부에 제공하지 않습니다. 서비스 운영을 위해 Supabase, Render 등 인프라 서비스를 이용할 수 있습니다.</p>
        <h2>5. 이용자 권리</h2>
        <p>이용자는 본인의 개인정보에 대해 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다.</p>
        <h2>6. 문의</h2>
        <p>개인정보 처리 관련 문의는 서비스 운영자가 제공하는 문의 채널을 통해 접수할 수 있습니다.</p>
      </div>
    </main>
  </body>
</html>
"""

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


@app.get("/api/health")
def health_check():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"ok": True}


@app.get("/privacy-policy", response_class=HTMLResponse, include_in_schema=False)
def privacy_policy_page():
    return PRIVACY_POLICY_HTML


app.mount("/images", StaticFiles(directory=str(IMAGES_DIR)), name="images")
