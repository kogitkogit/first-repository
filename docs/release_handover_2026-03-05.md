# CarCare 배포 핸드오버 (2026-03-05)

## 1. 목적
- 이번 세션에서 수행한 백엔드/프론트/배포 관련 작업을 정리한다.
- 현재 상태에서 Google Play 배포까지 남은 절차를 체크리스트 형태로 제공한다.

---

## 2. 이번 세션 완료 작업

### 2.1 백엔드 보안/운영
- API 권한 일관화 적용
  - `fuel`, `expenses`, `legal`에 인증/소유권 검증 추가
  - 타인 차량 접근 차단 확인
- CORS 운영 설정화
  - `allow_origins=["*"]` 제거
  - `ALLOWED_ORIGINS` 환경변수 기반 화이트리스트 적용
- Render Keepalive 안정화
  - `/api/health` 재시도 + 타임아웃 확장
  - 실패 시 `/docs` 폴백 ping 추가
- 비밀번호 평문 로그 제거
- 비밀번호 재설정 보안 강화
  - `/api/auth/reset`에 `current_password` 검증 추가
- 회원탈퇴 기능 추가
  - `/api/auth/delete-account` 추가
  - 계정/연관 데이터 삭제 처리

### 2.2 데이터베이스
- Docker PostgreSQL -> Supabase 데이터 이식 완료
  - 스키마 생성, 데이터 복사, 시퀀스 동기화, row count 검증 완료
  - 호환 컬럼만 복사하도록 마이그레이션 스크립트 보강

### 2.3 프론트/모바일 준비
- `web/.env.production` 추가
  - `VITE_API_BASE_URL=https://carcare-project.onrender.com/api`
- `npm run build` 성공
- `npm run cap:sync` 성공
- Android 릴리스 버전 상향
  - `versionCode 2`, `versionName 1.1.0`
- Android 서명 템플릿 추가
  - `web/android/keystore.properties.example`
- 설정 화면에 회원탈퇴 UI 추가
- 개인정보처리방침의 테스트용 문의처 제거

---

## 3. 주요 커밋 이력

- `d132c04`
  - API 권한 강화 + keepalive 안정화 + DB 마이그레이션 스크립트 추가
- `5a7b905`
  - CORS 운영 설정 반영 + 웹 production API env 추가
- `0266638`
  - Android 릴리스 버전 상향 + 서명 템플릿 추가
- (현재 커밋)
  - 비밀번호 재설정 보안 강화 + 회원탈퇴 API/UI + 개인정보처리방침 정리

---

## 4. 현재 반영 파일(최종)

### 백엔드
- `server/api/auth.py`
- `server/schemas/auth.py`
- `server/app.py`
- `server/core/config.py`
- `server/core/ownership.py`
- `server/migrate_to_supabase.py`
- `server/.env.example`

### 프론트/모바일
- `web/.env.production`
- `web/src/components/LoginScreen.jsx`
- `web/src/components/SettingsPanel.jsx`
- `web/android/app/build.gradle`
- `web/android/keystore.properties.example`

### 문서
- `docs/privacy_policy.md`
- `docs/release_handover_2026-03-05.md` (본 문서)

---

## 5. 검증 결과 요약

### 5.1 Render/운영 API
- `/api/health` 정상 응답 확인
- keepalive workflow 최신 실행 성공 확인 (`Run #28 success`)
- CORS 확인
  - 허용 origin: 통과
  - 비허용 origin: 차단

### 5.2 인증/보안 플로우
- 회원가입/로그인 성공
- 비밀번호 재설정:
  - 현재 비밀번호 오류 시 `401`
  - 현재 비밀번호 일치 시 `200`
- 회원탈퇴:
  - 비밀번호 오류 시 `401`
  - 비밀번호 일치 시 `200`
  - 탈퇴 후 로그인 불가 확인

### 5.3 프론트/빌드
- `npm run build` 성공
- `npm run cap:sync` 성공

---

## 6. 배포 전 남은 작업 (필수)

## 6.1 코드 반영/재배포
- [ ] 최신 커밋이 원격 `master`에 반영되었는지 확인
- [ ] Render `Deploy latest commit` 실행
- [ ] 재배포 후 스모크 테스트
  - [ ] `/api/health`
  - [ ] `/api/auth/reset` (`current_password` 필수 여부)
  - [ ] `/api/auth/delete-account`

## 6.2 Android 빌드 환경 준비
- [ ] JDK 설치 (권장 17)
- [ ] `JAVA_HOME` 설정
- [ ] `java -version` / `echo %JAVA_HOME%` 확인

## 6.3 릴리스 서명 파일 준비
- [ ] `web/android/keystore.properties.example`를 참고해 `web/android/keystore.properties` 생성
- [ ] 실제 `.keystore` 파일 경로/alias/password 입력
- [ ] `keystore.properties`는 Git 커밋 금지

## 6.4 AAB 생성
- [ ] `cd web`
- [ ] `npm run build`
- [ ] `npm run cap:sync`
- [ ] `cd android`
- [ ] `gradlew.bat bundleRelease`
- [ ] 산출물 확인: `web/android/app/build/outputs/bundle/release/app-release.aab`

## 6.5 Play Console 제출
- [ ] 앱 정보/설명/스크린샷/아이콘/피처그래픽 업로드
- [ ] 개인정보처리방침 URL 반영
- [ ] Data Safety 설문 입력
- [ ] 콘텐츠 등급/타깃 연령/광고 여부 설정
- [ ] 내부 테스트 트랙 업로드 후 검증

---

## 7. 권장 최종 점검 시나리오

- [ ] 신규 가입 -> 로그인 -> 차량 등록
- [ ] 주유/정비/소모품 기록 생성/조회
- [ ] 비밀번호 재설정(현재 비밀번호 검증) 확인
- [ ] 회원탈퇴 후 재로그인 실패 확인
- [ ] Android 실기기에서 로그인/기본 흐름 점검

---

## 8. 참고 명령어

```bash
# 웹 빌드 + Capacitor 동기화
cd web
npm run build
npm run cap:sync

# Android AAB 생성
cd android
gradlew.bat bundleRelease
```

```powershell
# Render health 확인
curl.exe https://carcare-project.onrender.com/api/health
```

