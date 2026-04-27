# 내차수첩 플레이스토어 출시 체크리스트 (2026-04-27)

## 1. 현재 완료 상태

- 패키지 빌드 확인
  - `debug APK` 빌드 성공
  - `release AAB` 빌드 성공
- 앱 아이콘 교체
  - Android `mipmap` 런처 아이콘 교체 완료
  - 플레이스토어용 `512x512 PNG` 생성 완료
- 스토어 자산 정리
  - 앱 아이콘 복사 완료
  - 대표 그래픽 `1024x500` 생성 완료
  - 휴대전화 스크린샷 5장 정리 완료
- 정책 문서
  - 개인정보처리방침 HTML 제공 중
  - 백업/복구 정책 HTML 제공 중
- 광고
  - AdMob 앱 ID 및 배너 단위 적용
  - UMP 동의 흐름 포함
- 계정/데이터 관리
  - 회원가입 계정 사용 가능
  - 비회원 재접속 가능
  - 회원 탈퇴 시 계정 데이터 삭제 가능

## 2. 업로드 자산 경로

- 앱 아이콘
  - [naechasutcheop_app_icon_512.png](C:\Users\sss54\Desktop\python\carcare\git\playstore_assets\app_icon\naechasutcheop_app_icon_512.png)
- 대표 그래픽
  - [naechasutcheop_feature_graphic_1024x500.png](C:\Users\sss54\Desktop\python\carcare\git\playstore_assets\feature_graphic\naechasutcheop_feature_graphic_1024x500.png)
- 휴대전화 스크린샷
  - [01_dashboard.png](C:\Users\sss54\Desktop\python\carcare\git\playstore_assets\phone_screenshots\01_dashboard.png)
  - [02_vehicle_management.png](C:\Users\sss54\Desktop\python\carcare\git\playstore_assets\phone_screenshots\02_vehicle_management.png)
  - [03_maintenance.png](C:\Users\sss54\Desktop\python\carcare\git\playstore_assets\phone_screenshots\03_maintenance.png)
  - [04_fuel_and_costs.png](C:\Users\sss54\Desktop\python\carcare\git\playstore_assets\phone_screenshots\04_fuel_and_costs.png)
  - [05_tire_and_documents.png](C:\Users\sss54\Desktop\python\carcare\git\playstore_assets\phone_screenshots\05_tire_and_documents.png)

## 3. Play Console에서 수동 입력 필요한 항목

- 앱 이름, 짧은 설명, 자세한 설명
- 앱 카테고리
- 개인정보처리방침 URL
- 광고 포함 여부
  - `Contains ads = Yes`
- Data safety 작성
  - 계정 정보
  - 사용자가 입력한 차량 정보/주행거리/정비/비용 기록
  - 광고 SDK 관련 데이터 처리
- 콘텐츠 등급 설문
- 타겟 연령 및 대상층
- 앱 접근 정보
  - 로그인/비회원 시작 테스트 방법 필요 시 제공
- 국가/지역 배포 범위

## 4. 출시 전 최종 점검 필요 항목

- 운영 API가 HTTPS로 안정적으로 응답하는지 확인
- Render 운영 서버 응답 지연/타임아웃 점검
- Supabase 운영 DB 연결 상태 확인
- AdMob 실광고 단위로 실기기 표시 확인
- 비회원 시작 -> 로그아웃 -> 비회원 재접속 흐름 실기기 확인
- 회원 탈퇴 시 데이터 삭제 확인
- 차량 등록/삭제 확인
- 주행거리 기록 조회/수정/삭제 확인
- 오일/필터/소모품/타이어/주유/비용 입력 저장 확인
- 정책 문서 화면 표시 확인

## 5. 기술 리스크 / 남은 권장 수정

- 릴리스 키 관리 강화 필요
  - `web/android/keystore.properties` 기본값 형태 비밀번호 사용 중
  - 실제 배포 전 강한 비밀번호와 안전한 보관 필요
- 운영 서버 상태 확인 필요
  - Render 헬스체크가 지연 또는 실패하는 구간이 있음
- 자동 테스트 없음
  - 현재는 실기기 수동 회귀 테스트 의존
- 광고 위치는 네이티브 오버레이 배너 방식
  - HTML 카드 내부 삽입은 현재 플러그인 구조상 불가

## 6. 현재 코드 기준 출시 가능 판단

- `AAB` 빌드 기준으로는 배포 가능한 상태
- 다만 실제 등록 직전에는 아래 2가지를 반드시 다시 확인해야 함
  - 운영 API 안정성
  - Play Console Data safety / 광고 / 개인정보처리방침 입력 정확성
