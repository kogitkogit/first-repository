# Render Web Service 설정 가이드 (FastAPI) A to Z

> 대상 프로젝트: `C:\Users\sss54\Desktop\python\carcare\git`  
> 목표: `server` 폴더(FastAPI)를 Render 무료 Web Service로 배포

---

## 0. 사전 준비

1. GitHub에 최신 코드 푸시
2. Render 계정 생성/로그인
3. Supabase DB 연결 문자열 준비 (`DATABASE_URL`)
4. 프로젝트 확인
   - `server/requirements.txt` 존재
   - `server/app.py` 존재
   - FastAPI 앱 객체: `app = FastAPI()`

---

## 1. Render에서 서비스 생성

1. Render 대시보드 접속
2. `New` 클릭
3. `Web Service` 선택
4. `Build and deploy from a Git repository` 선택
5. GitHub 연동 후 저장소 선택
6. `Connect` 클릭

---

## 2. 생성 화면 필수 설정값

아래 값을 그대로 입력:

1. `Name`: `carcare-api` (원하는 이름 가능)
2. `Region`: 사용자와 가까운 리전
3. `Branch`: `main` (또는 운영 브랜치)
4. `Root Directory`: `server`  (중요)
5. `Runtime/Language`: `Python`
6. `Build Command`: `pip install -r requirements.txt`
7. `Start Command`: `uvicorn app:app --host 0.0.0.0 --port $PORT`
8. `Instance Type`: `Free`
9. `Auto Deploy`: `Yes` 권장

---

## 3. Environment Variables 설정

Render 서비스 설정 화면에서 아래 변수 추가:

1. `DATABASE_URL`
   - Supabase SQLAlchemy URL
   - 예: `postgresql+psycopg2://.../postgres?sslmode=require`
2. `JWT_SECRET`
   - 강력한 랜덤 문자열(32자 이상 권장)
3. `JWT_ALG`
   - `HS256`
4. (선택) `PYTHON_VERSION`
   - 팀 표준 버전 고정 시 사용

---

## 4. 배포 실행

1. `Create Web Service` 클릭
2. 빌드 로그 확인
3. 배포 완료 후 서비스 URL 확인
   - 예: `https://carcare-api.onrender.com`

---

## 5. 배포 직후 검증

1. `https://<render-url>/docs` 접속 확인
2. 로그인 API 호출 확인
3. 차량 목록 API 호출 확인
4. Render `Logs` 탭에서 런타임 에러 확인

---

## 6. 무료 티어 슬립 방지 (14분 Ping)

현재 코드에 `/health` 엔드포인트가 없으므로:

1. 임시 URL: `https://<render-url>/docs`
2. 권장 URL: `https://<render-url>/api/health` (추가 후)

cron-job.org 설정:

1. 새 Job 생성
2. URL 입력
3. Method: `GET`
4. Interval: `14 minutes`
5. Timeout: `20 sec`
6. 저장 후 `Run now` 실행
7. Render 로그에서 주기 요청 확인

---

## 7. 자주 발생하는 오류와 해결

1. `ModuleNotFoundError`
   - 원인: Root Directory 오설정
   - 해결: `server`로 수정
2. 포트 바인딩 실패
   - 원인: `$PORT` 미사용
   - 해결: Start Command를 `--port $PORT` 포함 형태로 사용
3. DB 연결 실패
   - 원인: `DATABASE_URL` 오타/SSL 설정 누락
   - 해결: Supabase 연결 문자열 재확인, `sslmode=require` 확인
4. CORS 에러
   - 원인: 백엔드 CORS 제한
   - 해결: 프론트 도메인을 CORS 허용 목록에 추가

---

## 8. 이 프로젝트 기준 최종 설정 요약

1. Root Directory: `server`
2. Build Command: `pip install -r requirements.txt`
3. Start Command: `uvicorn app:app --host 0.0.0.0 --port $PORT`
4. 필수 ENV: `DATABASE_URL`, `JWT_SECRET`, `JWT_ALG=HS256`
5. 핑 주기: 14분

---

## 참고 링크

- Render Web Service: https://render.com/docs/web-services
- FastAPI on Render: https://render.com/docs/deploy-fastapi
- Python Version on Render: https://render.com/docs/python-version
