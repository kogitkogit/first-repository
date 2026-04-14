# 내차수첩 Supabase + Render 작업 정리 (2026-03-05)

작성 시각: 2026-03-05 00:20:09 +09:00

## 1) Supabase 설정/검증

- `server/.env`에 Supabase 연결값 반영
  - `DATABASE_URL` (`postgresql+psycopg2://...?...sslmode=require`)
  - `JWT_SECRET`
  - `JWT_ALG=HS256`
- DB 연결 확인
  - `current_database()`, `current_user` 조회 성공
- 초기 테이블 생성
  - `python init_db.py` 실행
  - `public` 스키마에 핵심 테이블 생성 확인 (`users`, `vehicles`, `maintenance_records`, `fuel_records` 등)
- 로컬 스모크 테스트 성공
  - 회원가입/로그인
  - 차량 등록/조회
  - 정비 생성/조회
  - 주유 생성/조회

## 2) 보안 조치

- `server/.env` Git 추적 제거 완료
- `.gitignore`에 `server/.env` 추가
- 결과: 시크릿 파일이 원격 저장소에서 추적되지 않도록 정리됨

## 3) Render 배포 설정

- Runtime: Python 3 (Docker 아님)
- Root Directory: `server`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app:app --host 0.0.0.0 --port $PORT`
- 환경변수:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `JWT_ALG=HS256`
  - `PYTHON_VERSION=3.11.11` (빌드 안정화용)

## 4) Render 실서버 검증

- `https://내차수첩-project.onrender.com/docs` 접속 확인
- 실서버 스모크 테스트 성공
  - 회원가입/로그인 성공
  - 차량 등록/조회 성공
- 헬스체크 엔드포인트 추가 및 반영
  - `GET /api/health` 구현
  - 최종 확인: `https://내차수첩-project.onrender.com/api/health` -> `200`, `{"ok":true}`

## 5) 슬립 방지(Keepalive)

- cron-job.org는 미사용
- GitHub Actions로 keepalive 구성 완료
  - 파일: `.github/workflows/render-keepalive.yml`
  - 주기: `*/14 * * * *`
  - 대상: `https://내차수첩-project.onrender.com/api/health`

## 6) 관련 커밋

- `2714dba` chore: update docs and stop tracking server env secret
- `d0c5681` feat: add health endpoint and scheduled render keepalive

## 7) 현재 결론

- Supabase 설정: 완료
- Render 설정/배포: 완료
- 운영 시 로컬 PC 상시 실행 필요 여부: 필요 없음

## 8) 운영 체크(권장)

- Render Logs에서 DB 오류 없는지 주기 확인
- GitHub Actions `Render Keepalive` 실행 성공 여부 확인

