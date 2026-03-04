# CarCare Android 배포 체크리스트 (React + Vite + FastAPI + Supabase + Render 무료)

> 목표: 현재 구조(React/Vite + FastAPI)를 유지한 채 Android 앱을 Google Play에 배포하고, 운영 비용을 0원(무료 플랜 범위)으로 유지한다.
> 기준일: 2026-03-04

---

## 0. 아키텍처 확정 체크

- [ ] 프론트: `web` (React + Vite + Capacitor)
- [ ] 백엔드: `server` (FastAPI)
- [ ] DB: Supabase Postgres (무료 플랜)
- [ ] 서버 호스팅: Render Web Service (무료 플랜)
- [ ] Render 절전 방지: 외부 cron에서 14분 간격 핑
- [ ] 배포 산출물: Android AAB (Play 업로드용)

---

## 1. 무료 운영 원칙 체크

- [ ] Supabase 무료 플랜 한도(용량/트래픽/휴면 정책) 확인
- [ ] Render 무료 플랜 한도(빌드 시간/실행 시간/휴면 정책) 확인
- [ ] cron 서비스 무료 플랜 한도(실행 주기/잡 개수) 확인
- [ ] 월별 사용량 초과 시 대응 정책 문서화
- [ ] 팀 공용 문서에 비용 0원 운영 정책 명시

---

## 2. 사전 준비 체크

- [ ] Google Play Console 계정 준비
- [ ] Android Studio 설치
- [ ] JDK 17 설치
- [ ] Node.js LTS 설치
- [ ] Python 3.11+ 설치
- [ ] Git 저장소 최신 반영
- [ ] 앱 패키지명 확정 (`com.carcare.app` 등)
- [ ] 앱 이름 확정
- [ ] 개인정보처리방침 URL 확정

---

## 3. Supabase 설정 체크

### 3-1. 프로젝트 생성

- [ ] Supabase에서 새 프로젝트 생성
- [ ] DB 비밀번호 안전하게 저장(비밀 관리자 권장)
- [ ] Region 선택(사용자와 가까운 리전)

### 3-2. DB 연결 정보 확보

- [ ] `Project Settings -> Database`에서 Connection String 확인
- [ ] SQLAlchemy용 URL 형태로 변환 확인  
  예: `postgresql+psycopg2://USER:PASSWORD@HOST:PORT/postgres`
- [ ] SSL 옵션 확인(`sslmode=require` 필요 시 반영)

### 3-3. 스키마 반영

- [ ] 로컬에서 마이그레이션/테이블 생성 수행
- [ ] 핵심 테이블 생성 확인(`users`, `vehicles`, `maintenance_records`, `fuel_records` 등)
- [ ] 인덱스 확인(조회 성능 관련)
- [ ] 시드 데이터 필요 시 반영(제조사/모델 등)

### 3-4. DB 연결 검증

- [ ] 로컬 FastAPI에서 Supabase DB 연결 성공
- [ ] CRUD 테스트 성공(차량 등록/조회, 정비 등록/조회)
- [ ] 타이어/법적정보 API까지 정상 작동 확인

---

## 4. FastAPI 프로덕션 설정 체크

### 4-1. 환경변수 정리

- [ ] `DATABASE_URL`을 Supabase URL로 변경
- [ ] `JWT_SECRET` 강력한 랜덤 값으로 교체
- [ ] `JWT_ALG=HS256` 확인
- [ ] 로컬 `.env`와 운영 환경변수 분리

### 4-2. CORS/보안

- [ ] `allow_origins=["*"]`를 운영 도메인 기준으로 축소할지 결정
- [ ] 인증/인가 경로 정상 동작 확인
- [ ] 비밀번호 해시/토큰 만료 정책 확인

### 4-3. 헬스체크 엔드포인트

- [ ] `/health` 또는 `/api/health` 엔드포인트 준비
- [ ] DB 연결 여부까지 확인하는 간단한 헬스체크 구현
- [ ] cron 핑 대상 URL 확정

---

## 5. Render 배포 체크

### 5-1. 서비스 생성

- [ ] Render에서 `Web Service` 생성
- [ ] GitHub 저장소 연결
- [ ] Root Directory를 `server`로 설정
- [ ] Runtime: Python

### 5-2. 빌드/실행 명령

- [ ] Build Command 설정  
  `pip install -r requirements.txt`
- [ ] Start Command 설정  
  `uvicorn app:app --host 0.0.0.0 --port $PORT`

### 5-3. 환경변수 등록

- [ ] `DATABASE_URL`
- [ ] `JWT_SECRET`
- [ ] `JWT_ALG`
- [ ] 기타 필요한 설정값

### 5-4. 배포 검증

- [ ] Render 배포 로그에서 에러 없음 확인
- [ ] 공개 URL에서 `/docs` 접근 확인
- [ ] 핵심 API 호출 성공 확인

---

## 6. Render 절전 방지 cron 체크 (14분)

### 6-1. cron 서비스 준비

- [ ] cron-job.org(또는 동등 서비스) 계정 생성
- [ ] 새 잡 생성
- [ ] URL: Render 헬스체크 엔드포인트 입력
- [ ] Method: `GET`
- [ ] Interval: `14 minutes`
- [ ] Timeout: 10~20초 설정

### 6-2. 검증

- [ ] 수동 실행 1회 성공(HTTP 200)
- [ ] 다음 예약 실행 성공 확인
- [ ] Render 로그에서 주기적 요청 확인
- [ ] 24시간 이후에도 슬립 없이 응답되는지 확인

### 6-3. 장애 대응

- [ ] cron 실패 시 이메일 알림 켜기
- [ ] Render 장애 시 재배포 절차 문서화
- [ ] 무료 플랜 정책 변경 시 대체안 준비

---

## 7. 프론트엔드 프로덕션 설정 체크 (Vite)

### 7-1. API URL 반영

- [ ] `web/.env.production` 생성
- [ ] `VITE_API_BASE_URL=https://<render-domain>/api` 설정
- [ ] 로컬 개발용 `.env`와 분리

### 7-2. 빌드 검증

- [ ] `cd web`
- [ ] `npm install`
- [ ] `npm run build`
- [ ] 빌드 성공 확인
- [ ] `dist` 내부에 운영 API 주소 반영 확인

---

## 8. Capacitor + Android 동기화 체크

### 8-1. 동기화

- [ ] `cd web`
- [ ] `npm run cap:sync`
- [ ] `android` 프로젝트 동기화 성공

### 8-2. AndroidManifest 점검

- [ ] `INTERNET` 권한 확인
- [ ] Cleartext 트래픽 사용 안 함 확인(HTTPS 기준)
- [ ] 앱 아이콘/스플래시 확인

### 8-3. 기기 테스트

- [ ] 에뮬레이터 실행 테스트
- [ ] 실기기 실행 테스트
- [ ] 로그인/차량선택/대시보드/핵심 CRUD 테스트
- [ ] 백버튼 동작 확인

---

## 9. 서명 및 AAB 생성 체크

### 9-1. 키스토어 생성/보관

- [ ] 릴리스 키스토어 생성
- [ ] 키 alias/비밀번호 안전 보관
- [ ] 팀 공유 보안 저장소에 백업

### 9-2. Gradle 서명 설정

- [ ] `web/android/app/build.gradle`에 `signingConfigs.release` 반영
- [ ] 비밀번호는 `gradle.properties`/CI Secret로 분리
- [ ] Git에 민감정보 커밋 금지 확인

### 9-3. 번들 생성

- [ ] `cd web/android`
- [ ] `./gradlew bundleRelease` (Windows: `gradlew.bat bundleRelease`)
- [ ] `app-release.aab` 생성 확인

---

## 10. Google Play Console 등록 체크

### 10-1. 앱 기본 정보

- [ ] 앱 생성(앱명/언어/카테고리)
- [ ] 무료 앱으로 설정
- [ ] 패키지명 일치 확인

### 10-2. 스토어 등록정보

- [ ] 앱 아이콘(512x512) 업로드
- [ ] 기능 그래픽(1024x500) 업로드
- [ ] 스크린샷 2장 이상 업로드
- [ ] 간단 설명/자세한 설명 작성

### 10-3. 정책/설문

- [ ] 개인정보처리방침 URL 입력
- [ ] Data Safety 설문 완료
- [ ] 광고 포함 여부 설정
- [ ] 앱 액세스(로그인 필요 시 테스트 계정) 입력
- [ ] 콘텐츠 등급 완료

### 10-4. 릴리스

- [ ] Internal Testing 트랙에 AAB 업로드
- [ ] 내부 테스터 설치 검증
- [ ] 문제 없으면 Production 릴리스 생성

---

## 11. 출시 전 최종 점검 체크리스트

- [ ] Render API URL이 앱 빌드에 정확히 반영됨
- [ ] Supabase 연결 안정적이며 쿼리 에러 없음
- [ ] cron 14분 핑이 정상 수행됨
- [ ] 앱 첫 실행부터 주요 플로우 오류 없음
- [ ] 앱 종료/백그라운드/재실행 시 세션 정상
- [ ] Play Console 필수 항목 누락 없음
- [ ] 버전코드 증가 확인
- [ ] 릴리스 노트 작성 완료

---

## 12. 출시 후 운영 체크

- [ ] 매일 Render 로그/에러 확인
- [ ] Supabase 사용량(저장공간/쿼리) 주간 확인
- [ ] cron 실패 알림 모니터링
- [ ] 사용자 피드백/리뷰 대응
- [ ] 다음 버전 배포 시 버전코드 증가

---

## 13. 실행 명령 빠른 참조

```bash
# 1) 프론트 빌드
cd web
npm install
npm run build

# 2) Capacitor 동기화
npm run cap:sync

# 3) Android 번들 생성
cd android
gradlew.bat bundleRelease
```

---

## 14. 운영비 0원 유지 조건 요약

- [ ] Render 무료 티어 한도 내 유지
- [ ] Supabase 무료 티어 한도 내 유지
- [ ] cron 무료 티어 한도 내 유지
- [ ] 트래픽 급증 시 유료 전환 기준 사전 정의

> 주의: 무료 플랜 정책은 변경될 수 있으므로 월 1회 정책 재확인 필요.
