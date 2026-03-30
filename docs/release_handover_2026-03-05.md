# CarCare 배포 핸드오버 (최신화: 2026-03-06)

## 1) 현재 전체 상태 요약
- 백엔드 운영: 완료 (Render + Supabase 연동, 헬스체크/keepalive 동작 확인)
- 백엔드 안정화/보안: 완료 (권한 검증, CORS 화이트리스트, 비밀번호 재설정 검증 강화, 회원탈퇴 API)
- 모바일 앱 배포 준비: 진행 중
- Android 릴리즈 빌드 체인: 완료 (JDK/SDK/Capacitor Sync/AAB 빌드 성공)
- Google Play 제출: 미완료 (메타데이터/정책/트랙 배포 단계 남음)

## 2) 이번 최신 작업(2026-03-06) 반영 내용

### 2.1 Android 빌드 환경 정상화
- JDK 21 설치 및 빌드 검증 완료
- Android SDK 구성 완료
  - `platform-tools`
  - `platforms;android-36` (빌드 중 자동 설치)
  - `build-tools;35.0.0` (빌드 중 자동 설치)
- `web/android/local.properties`에 SDK 경로 반영

### 2.2 앱 빌드 파이프라인 검증
- `web`에서 `npm run build` 성공
- `web`에서 `npm run cap:sync` 성공
- `web/android`에서 `gradlew.bat bundleRelease` 성공
- 산출물 확인 완료:
  - `web/android/app/build/outputs/bundle/release/app-release.aab`

### 2.3 서명/Gradle 설정 보정
- `web/android/app/build.gradle`
  - `signingConfigs` 선언 순서를 `buildTypes`보다 앞으로 이동
  - 이유: `signingConfigs.release` 참조 시점 오류 해결
- `web/android/keystore.properties.example`
  - `storeFile` 경로를 모듈 기준으로 수정
  - 변경: `../../keystore/carcare-release.keystore`
- `.gitignore`
  - `web/android/keystore.properties`
  - `web/keystore/`
  - 목적: 서명 민감정보/키파일 커밋 방지

## 3) 현재 Git 작업 상태(로컬)
- 수정됨:
  - `.gitignore`
  - `web/android/app/build.gradle`
  - `web/android/keystore.properties.example`
- 미추적 민감 파일은 `.gitignore`로 제외됨
  - `web/android/keystore.properties`
  - `web/keystore/*`

## 4) 완료된 배포 체인 체크
- [x] Render 재배포 및 기본 접근 확인
- [x] `/api/health` 응답 확인
- [x] Keepalive 워크플로우 실패 원인 수정 및 재검증
- [x] Docker Postgres -> Supabase 데이터 이식
- [x] 백엔드 스모크 테스트
- [x] 프론트 프로덕션 빌드
- [x] Capacitor Android 동기화
- [x] Android AAB 생성

## 5) 다음 단계(우선순위)

### Step 2. Play Console 제출 패키지 완성
1. 스토어 리스팅 자산 준비
- 앱 아이콘(512x512)
- 피처 그래픽(1024x500)
- 휴대전화 스크린샷 2종 이상

2. 스토어 문구/정보 확정
- 간단 설명/자세한 설명
- 카테고리/앱 유형
- 개발자 연락처(이메일 필수)

3. 정책/컴플라이언스 정리
- 개인정보처리방침 URL 공개 상태 최종 확인
- Data safety 설문 작성
- 광고 여부/콘텐츠 등급/타겟 연령 설정

4. 트랙 배포
- 내부 테스트(Internal testing) 트랙에 AAB 업로드
- 테스터 설치/실사용 스모크 테스트

### Step 3. 프로덕션 릴리즈
- 내부 테스트 피드백 반영
- `versionCode` +1, `versionName` 갱신
- 프로덕션 트랙 릴리즈 진행

## 6) 즉시 실행 명령어
```powershell
cd web
npm run build
npm run cap:sync

cd android
.\gradlew.bat bundleRelease
```

## 7) 리스크/주의사항
- 현재 로컬 키스토어는 테스트용으로 생성되어 있음
- Play 프로덕션 업로드 전 운영용 서명키/비밀번호 체계로 교체 권장
- 서명키 분실 방지: 오프라인 백업 + 접근권한 최소화 필요
