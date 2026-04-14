# 내차수첩 Google Play 배포 실행본 (무료 운영: Supabase + Render + 14분 Ping)

> 작성일: 2026-03-04  
> 대상 리포지토리: `C:\Users\sss54\Desktop\python\내차수첩\git`  
> 목표: 현재 구조(React/Vite + FastAPI)를 유지한 채 Android AAB 배포 및 무료 운영(0원)

---

## 1. 현재 저장소 기준 확정값

- 앱 ID: `com.carcare.app` (`web/capacitor.config.json`, `web/android/app/build.gradle`)
- 앱 이름: `내차수첩` (`web/capacitor.config.json`)
- Android 버전코드: `1` (`web/android/app/build.gradle`)
- Android 버전명: `1.0` (`web/android/app/build.gradle`)
- 프론트 API 기본값(개발용): `http://127.0.0.1:8000/api` (`web/src/api/client.js`)

---

## 2. 배포 전 확정해야 하는 값(입력칸)

아래 값을 먼저 확정하고 문서에 기록:

- [ ] Render 서비스 URL: `https://________________.onrender.com`
- [ ] Supabase DB URL(SQLAlchemy): `postgresql+psycopg2://...`
- [ ] JWT_SECRET(랜덤 32자 이상): `________________`
- [ ] cron 서비스: `cron-job.org` 또는 `UptimeRobot`
- [ ] 개인정보처리방침 URL: `https://________________`

---

## 3. 백엔드(FastAPI) 배포 실행 절차

### 3-1. Supabase 준비

- [ ] Supabase 프로젝트 생성
- [ ] `Project Settings -> Database`에서 연결 문자열 확인
- [ ] SQLAlchemy 포맷으로 변환
- [ ] SSL 요구 시 `?sslmode=require` 적용

예시:

```env
DATABASE_URL=postgresql+psycopg2://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require
JWT_SECRET=<STRONG_SECRET>
JWT_ALG=HS256
```

### 3-2. Render Web Service 생성

- [ ] New Web Service -> GitHub 저장소 연결
- [ ] Root Directory: `server`
- [ ] Build Command: `pip install -r requirements.txt`
- [ ] Start Command: `uvicorn app:app --host 0.0.0.0 --port $PORT`
- [ ] Environment Variables 등록:
  - [ ] `DATABASE_URL`
  - [ ] `JWT_SECRET`
  - [ ] `JWT_ALG=HS256`
- [ ] Deploy 완료 확인

검증:

- [ ] `https://<render-url>/docs` 접근 성공
- [ ] 로그인 API/차량 리스트 API 200 응답 확인

---

## 4. Render 절전 방지(14분 Ping) 실행 절차

## 중요

현재 코드에는 `/health` 엔드포인트가 없음.  
따라서 다음 중 하나 선택:

1. 임시: `/docs`를 핑 URL로 사용
2. 권장: `/api/health` 추가 후 해당 URL 사용

### 4-1. cron-job.org 설정

- [ ] cron-job.org 가입
- [ ] 새 Job 생성
- [ ] URL 입력:
  - 임시: `https://<render-url>/docs`
  - 권장: `https://<render-url>/api/health`
- [ ] Method: `GET`
- [ ] Interval: `14 minutes`
- [ ] Timeout: `20 sec`
- [ ] Save 후 Run now 1회 실행

### 4-2. 검증

- [ ] cron-job 로그 상태 `OK`
- [ ] Render 로그에서 14분 주기 요청 확인
- [ ] 12시간 후 첫 요청 지연(콜드스타트) 감소 여부 확인

---

## 5. 프론트(React/Vite) 운영 설정 실행 절차

### 5-1. 운영 API 주소 주입

`web/.env.production` 생성:

```env
VITE_API_BASE_URL=https://<render-url>/api
```

체크:

- [ ] 로컬 `.env`와 `.env.production` 분리됨
- [ ] `127.0.0.1` 주소가 운영 빌드에 포함되지 않음

### 5-2. 프론트 빌드

```bash
cd web
npm install
npm run build
```

- [ ] 빌드 성공
- [ ] `web/dist` 생성

---

## 6. Capacitor Android 동기화 실행 절차

### 6-1. 동기화

```bash
cd web
npm run cap:sync
```

- [ ] Android 프로젝트 동기화 성공

### 6-2. AndroidManifest 점검

파일: `web/android/app/src/main/AndroidManifest.xml`

- [ ] `<uses-permission android:name="android.permission.INTERNET" />` 존재 확인
- [ ] HTTP(cleartext) 의존 없음(HTTPS API 사용)

### 6-3. 앱 실행 점검

- [ ] Android Studio로 `web/android` 오픈
- [ ] 에뮬레이터 실행
- [ ] 실기기 실행
- [ ] 핵심 플로우 점검:
  - [ ] 로그인
  - [ ] 차량 선택
  - [ ] 대시보드 조회
  - [ ] 정비/주유/소모품/타이어 저장·조회·삭제

---

## 7. 서명 및 AAB 생성 실행 절차

### 7-1. 키스토어 생성(최초 1회)

```bash
keytool -genkeypair -v -keystore 내차수첩-release.keystore -alias 내차수첩 -keyalg RSA -keysize 2048 -validity 10000
```

- [ ] keystore 파일 안전 보관
- [ ] 비밀번호 분실 방지(문서+비밀저장소)

### 7-2. 서명 설정

파일: `web/android/app/build.gradle`

- [ ] `signingConfigs.release` 구성
- [ ] `buildTypes.release`에 signingConfig 연결
- [ ] 비밀번호는 `gradle.properties`로 분리

### 7-3. AAB 생성

```bash
cd web/android
gradlew.bat bundleRelease
```

- [ ] 산출물 확인: `web/android/app/build/outputs/bundle/release/app-release.aab`

---

## 8. Google Play Console 업로드 실행 절차

### 8-1. 앱 등록

- [ ] 앱 생성 (무료 앱, 기본 언어 설정)
- [ ] 패키지명 `com.carcare.app` 확인

### 8-2. 스토어 등록정보

- [ ] 앱 아이콘(512x512)
- [ ] 기능 그래픽(1024x500)
- [ ] 스크린샷 2장 이상
- [ ] 간단 설명/자세한 설명

### 8-3. 정책 항목

- [ ] 개인정보처리방침 URL 입력
- [ ] Data Safety 설문 완료
- [ ] 광고 여부 선택
- [ ] 콘텐츠 등급 완료
- [ ] 로그인 앱 접근 정보(테스트 계정) 입력

### 8-4. 릴리스

- [ ] Internal Testing 트랙에 AAB 업로드
- [ ] 설치/동작 확인
- [ ] Production 릴리스 제출

---

## 9. 버전 업데이트 규칙(반드시)

릴리스마다 아래 증가:

- [ ] `versionCode`: +1
- [ ] `versionName`: 의미 있는 버전으로 갱신

파일: `web/android/app/build.gradle`

---

## 10. 무료 운영 유지 체크(월간)

- [ ] Render 사용량/정책 변경 확인
- [ ] Supabase 사용량/정책 변경 확인
- [ ] cron 서비스 사용량 확인
- [ ] 무료 한도 초과 징후 발생 시 즉시 알림

---

## 11. 즉시 실행용 커맨드 묶음

```bash
# 1) 프론트 빌드
cd web
npm install
npm run build

# 2) Capacitor 동기화
npm run cap:sync

# 3) Android AAB 생성
cd android
gradlew.bat bundleRelease
```

---

## 12. 최종 Go/No-Go 체크

- [ ] 운영 API가 Render HTTPS URL로 연결됨
- [ ] DB가 Supabase로 연결됨
- [ ] 14분 ping 정상 동작
- [ ] AAB 생성 완료
- [ ] Play Console 필수 정책 입력 완료
- [ ] 내부 테스트 통과

`모든 항목 완료 시: Production 배포 진행`


