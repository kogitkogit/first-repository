# 구글 플레이스토어 출시 절차 상세 가이드 (내차수첩)

기준일: 2026-04-28  
앱명: `내차수첩`  
패키지명: `com.kogit.mycarnote`  
업로드 대상 파일: `web/android/app/build/outputs/bundle/release/app-release.aab`

이 문서는 현재 프로젝트를 실제로 Google Play Console에 등록하고 출시하기 위한 실행 절차를 단계별로 정리한 문서입니다.  
공식 문서 기준 흐름을 따르되, 현재 저장소 상태와 이미 준비된 항목을 함께 반영했습니다.

---

## 1. 사전 준비

출시 전에 먼저 준비되어 있어야 하는 항목입니다.

### 1-1. 개발자 계정 준비

다음이 먼저 완료되어 있어야 합니다.

- Google Play Console 개발자 계정 가입
- 개발자 신원 인증 절차 완료
- 결제 프로필 또는 세금/정산 관련 정보 입력 완료

주의:

- 개인 개발자 계정은 계정 생성 시점과 계정 상태에 따라 추가 테스트 요구사항이 있을 수 있습니다.
- 개인 개발자 계정이 2023-11-13 이후 생성된 경우, 프로덕션 공개 전에 테스트 트랙 요건이 걸릴 수 있습니다.

### 1-2. 현재 프로젝트 기준 준비 상태

현재 프로젝트 기준으로 이미 준비된 항목은 아래와 같습니다.

- 앱 이름: `내차수첩`
- 패키지명: `com.kogit.mycarnote`
- 안드로이드 앱 번들: 생성 완료
- 개인정보처리방침 공개 URL:
  - `https://carcare-project.onrender.com/privacy-policy`
- 백업/복구 정책 공개 URL:
  - `https://carcare-project.onrender.com/backup-recovery-policy`
- 광고 사용 예정:
  - `Google AdMob` 배너 광고

출시 직전 최종 확인 필요 항목:

- `versionCode`
- `versionName`
- 광고 포함 여부 선언
- Data safety 입력
- 콘텐츠 등급 설문
- 앱 액세스 정보

---

## 2. Play Console에서 앱 생성

### 2-1. 새 앱 만들기

Play Console에서 다음 순서로 진행합니다.

1. `Play Console` 접속
2. 좌측 또는 홈 화면에서 `Create app`
3. 기본 언어 선택
4. 앱 이름 입력: `내차수첩`
5. 앱/게임 구분: `앱`
6. 무료/유료 선택
   - 일반적으로 현재 앱은 `무료`
7. 사용자 문의용 이메일 입력
8. 약관 및 선언 항목 동의
9. `Create app`

중요:

- 패키지명은 앱 번들 업로드 시 사실상 고정됩니다.
- 이미 확정한 패키지명은 `com.kogit.mycarnote`입니다.

---

## 3. 스토어 등록 정보 입력

### 3-1. 앱 세부정보

`Main store listing`에서 입력합니다.

- 앱 이름
  - `내차수첩`
- 짧은 설명
  - 예시: `주행거리 입력만으로 정비·주유·비용을 쉽게 관리하는 차량 관리 앱`
- 자세한 설명
  - 실사용 기능 중심으로 작성
  - 과장 문구 금지
  - 실제 앱에 없는 기능 금지

권장 설명 구조:

1. 앱 한 줄 소개
2. 핵심 기능 5~8개
3. 어떤 사용자에게 적합한지
4. 비회원 시작/회원가입 구조 설명

### 3-2. 그래픽 자산 업로드

업로드 위치: `Main store listing`

필수 또는 사실상 필수 자산:

- 앱 아이콘: `512x512 PNG`
- 대표 그래픽: `1024x500`
- 휴대전화 스크린샷: 최소 `2장`, 권장 `5장 이상`

현재 저장소에서 참고 가능한 자산 위치:

- 앱 아이콘 폴더:
  - `playstore_assets/app_icon/`
- 대표 그래픽 폴더:
  - `playstore_assets/feature_graphic/`
- 스크린샷 폴더:
  - `playstore_assets/phone_screenshots/`

체크 포인트:

- 한글 문구 오탈자 확인
- 실제 앱과 다른 UI 사용 금지
- 광고가 보이는 스크린샷을 넣을 경우 사용자 오해가 없도록 정리

### 3-3. 앱 카테고리 및 연락처

다음 정보도 채웁니다.

- 앱 카테고리
  - 권장: `자동차 및 차량` 또는 가장 근접한 생산성/도구 계열
- 연락처 이메일
- 필요 시 웹사이트
- 필요 시 전화번호

주의:

- 개발자 연락처가 필수 아닌 항목이면 불필요한 임시값은 넣지 않는 편이 낫습니다.

---

## 4. 앱 콘텐츠(App content) 작성

이 단계는 심사에서 매우 중요합니다. 누락되면 거의 반드시 보류 또는 추가 조치가 발생합니다.

### 4-1. 개인정보처리방침

입력 위치:

- `App content` 또는 스토어 등록 정보 내 Privacy policy URL 항목

현재 사용할 URL:

- `https://carcare-project.onrender.com/privacy-policy`

중요:

- 앱 내부에서도 사용자가 해당 문서를 확인할 수 있어야 합니다.
- 현재 프로젝트는 앱 내부에서 문서 보기 흐름이 연결되어 있습니다.

### 4-2. 광고 포함 여부

앱에 AdMob 배너 광고를 사용하므로 다음과 같이 입력합니다.

- `Contains ads`: `Yes`

주의:

- 실제 앱에 광고가 있는데 `No`로 입력하면 문제됩니다.
- 반대로 아직 광고가 비활성화 상태더라도 앱 구조상 포함 예정이면 실제 동작 기준으로 정확히 기입해야 합니다.

### 4-3. Data safety

이 단계는 반드시 사실대로 작성해야 합니다.

현재 앱 기준으로 검토해야 할 데이터 범주:

- 계정 정보
  - 아이디
  - 비밀번호
- 사용자 입력 정보
  - 차량 번호
  - 제조사
  - 모델
  - 연식
  - 연료 타입
  - 주행거리 기록
  - 정비 기록
  - 주유/충전 기록
  - 비용 기록
  - 타이어 기록
  - 법적 서류 기록
- 광고/진단 관련 데이터
  - AdMob SDK 처리 범위

작성 시 검토할 질문:

1. 어떤 데이터를 수집하는가
2. 어떤 데이터를 외부와 공유하는가
3. 전송 중 암호화되는가
4. 사용자가 데이터 삭제를 요청할 수 있는가

현재 앱 기준 메모:

- 회원 탈퇴 및 데이터 삭제 기능이 앱 내에 있어야 함
- 비회원 사용자는 기기 의존적 복구 제한이 있다는 점을 앱 설명과 정책 문서에 반영해야 함

### 4-4. 콘텐츠 등급(Content rating)

설문을 통해 자동 산정됩니다.

현재 앱 성격상 일반적인 차량 관리 앱이므로 보통 저위험군이 예상되지만, 실제 설문 응답값에 따라 결정됩니다.

주의:

- 기능보다 높거나 낮게 왜곡해서 답하면 안 됩니다.

### 4-5. 타겟 연령 및 아동 관련

보통 다음 방향으로 검토합니다.

- 일반 사용자 대상
- 아동용 앱 아님

앱이 아동을 주요 대상으로 하지 않는다면 그에 맞춰 정확히 응답합니다.

### 4-6. 앱 액세스(App access)

로그인이 필요한 앱이면 심사용 접근 방법을 제공해야 할 수 있습니다.

현재 앱 구조:

- 회원가입 후 시작 가능
- 비회원으로 시작 가능

심사 대응 권장안:

- 심사자가 바로 들어갈 수 있도록
  - 테스트 계정 제공
  - 또는 `비회원으로 시작하기` 사용 가능 여부 설명

예시 메모:

- `앱은 비회원 시작 기능을 제공하므로 심사자는 별도 가입 없이 앱 주요 기능을 확인할 수 있습니다.`

### 4-7. 민감 권한 선언

앱 번들에 고위험 권한이 있으면 별도 권한 선언 양식이 뜹니다.

현재 AndroidManifest 기준 주요 권한:

- `INTERNET`
- `AD_ID`

현재 기준으로 SMS/통화기록/위치/파일 전체 접근 같은 고위험 권한은 보이지 않습니다.  
다만 최종 AAB 업로드 후 Play Console이 실제 번들 기준으로 다시 판정하므로, 업로드 뒤 경고가 없는지 꼭 확인해야 합니다.

---

## 5. 앱 서명과 업로드 파일 준비

### 5-1. 업로드 대상 파일

Google Play에는 `APK`가 아니라 `AAB`를 업로드하는 것이 기본입니다.

현재 업로드 파일:

- `web/android/app/build/outputs/bundle/release/app-release.aab`

### 5-2. Play App Signing

Google Play는 신규 앱에서 일반적으로 `Play App Signing` 사용을 요구합니다.

실무 흐름:

1. 로컬에서 업로드 키로 AAB 서명
2. Play Console에 업로드
3. 실제 배포 서명은 Google Play가 관리

주의:

- `keystore.properties`
- 업로드 키 파일
- 키 비밀번호

이 3개는 반드시 안전하게 백업해야 합니다.

업로드 키를 잃으면 추후 앱 업데이트가 매우 번거로워집니다.

### 5-3. 버전 관리

업로드 전 반드시 확인:

- `versionCode`는 이전보다 증가해야 함
- `versionName`은 사용자에게 보일 버전 문자열

현재 `build.gradle` 기준 확인 및 필요 시 수정 후 다시 빌드합니다.

---

## 6. 테스트 트랙 운영

### 6-1. 테스트가 필요한 이유

바로 프로덕션 공개 전에 다음을 거치는 편이 안전합니다.

- 내부 테스트
- 비공개 테스트

개인 개발자 계정은 계정 상태에 따라 실제로 테스트 트랙 요구가 있을 수 있습니다.

### 6-2. 권장 순서

1. `Internal testing`
2. 필요 시 `Closed testing`
3. 문제 없으면 `Production`

### 6-3. 내부 테스트 등록 절차

1. `Testing > Internal testing`
2. 새 릴리스 생성
3. `app-release.aab` 업로드
4. 릴리스 노트 입력
5. 저장 후 검토
6. 테스터 이메일 추가
7. 테스트 배포

권장 릴리스 노트 예시:

- `내차수첩 1.1.0 내부 테스트 배포`
- `패키지명 정리, UI 수정, 광고/정책 반영 상태 점검`

---

## 7. 프로덕션 출시 절차

### 7-1. 프로덕션 릴리스 만들기

1. `Test and release > Production`
2. `Create new release`
3. `app-release.aab` 업로드
4. 릴리스 노트 입력
5. 저장
6. `Review release`

### 7-2. 사전 검토 경고 해결

이 단계에서 Play Console이 아래를 검사합니다.

- 누락된 App content
- 데이터 보안 양식 미완료
- 광고 선언 누락
- 개인정보처리방침 누락
- 고위험 권한 선언 누락
- 타겟 API 문제

경고가 있으면 반드시 모두 해결합니다.

### 7-3. 프로덕션 제출

경고가 모두 해소되면:

1. `Start rollout to Production`
2. 확인 팝업 검토
3. 제출

이후 Google 심사 대기 상태로 전환됩니다.

---

## 8. 심사 중 확인할 것

심사 중에는 아래를 지속 확인합니다.

- 정책 경고 메일 수신 여부
- Play Console Inbox 메시지
- App content 추가 요청 여부
- 테스트 계정 또는 접근 정보 추가 요청 여부

특히 광고, 개인정보, 데이터 수집 관련 질문은 빠르게 대응하는 편이 좋습니다.

---

## 9. 심사 통과 후 운영 절차

출시 후 바로 할 일입니다.

### 9-1. 설치 및 기능 점검

실제 Play 설치본 기준으로 아래를 확인합니다.

- 로그인
- 비회원 시작
- 차량 등록
- 차량 삭제
- 주행거리 업데이트
- 대시보드 데이터 로딩
- 오일/필터/소모품 입력
- 주유/충전 기록
- 타이어 관리
- 설정/정책 문서 확인
- 광고 표시 여부

### 9-2. 모니터링

출시 직후 최소 1주일은 다음을 봅니다.

- ANR
- 크래시
- 리뷰
- 설치 수
- 제거율
- 광고 동작
- Render 서버 응답 속도

### 9-3. 첫 업데이트 준비

문제가 있으면 다음 순서로 대응합니다.

1. 코드 수정
2. `versionCode` 증가
3. `AAB` 재빌드
4. 내부 테스트
5. 프로덕션 업데이트 배포

---

## 10. 현재 프로젝트 기준 실제 체크리스트

이 저장소 기준으로 마지막 업로드 전에 확인할 항목입니다.

### 필수

- [ ] 패키지명 `com.kogit.mycarnote` 최종 확인
- [ ] `app-release.aab` 최신 빌드 확인
- [ ] 앱 이름 `내차수첩` 확인
- [ ] 개인정보처리방침 URL 입력
- [ ] 백업/복구 정책 문서 확인
- [ ] 광고 포함 여부 `Yes`
- [ ] Data safety 입력 완료
- [ ] 콘텐츠 등급 설문 완료
- [ ] 앱 액세스 설명 완료
- [ ] 스크린샷/아이콘/대표 그래픽 업로드

### 권장

- [ ] 내부 테스트 먼저 진행
- [ ] 심사용 테스트 계정 또는 비회원 시작 가이드 준비
- [ ] Render 응답 속도 최종 점검
- [ ] 배포 후 실제 다운로드 설치 테스트

---

## 11. 자주 발생하는 실수

- 패키지명 확정 전에 업로드
- `versionCode` 증가 누락
- 광고 사용 중인데 `Contains ads` 누락
- 개인정보처리방침 URL 누락
- Data safety를 대충 입력
- 앱 내 기능과 스토어 설명이 다름
- 스크린샷에 실제 없는 UI를 넣음
- 테스트 앱과 운영 앱 패키지를 혼동

---

## 12. 권장 실제 진행 순서

현재 이 프로젝트에서는 아래 순서로 진행하는 것이 가장 안전합니다.

1. `app-release.aab` 최종 빌드 확인
2. Play Console에서 새 앱 생성
3. 스토어 등록 정보 입력
4. 앱 콘텐츠 전부 입력
5. 내부 테스트 트랙 업로드
6. 테스트 설치 및 최종 확인
7. 프로덕션 릴리스 생성
8. 검토 경고 전부 해소
9. 프로덕션 제출
10. 심사 대응 및 출시 후 모니터링

---

## 13. 공식 문서

아래 문서를 기준으로 작성했습니다.

- Create and set up your app  
  https://support.google.com/googleplay/android-developer/answer/9859152?hl=en

- Prepare and roll out a release  
  https://support.google.com/googleplay/android-developer/answer/9859348?hl=en-EN

- Prepare your app for review  
  https://support.google.com/googleplay/android-developer/answer/9859455?hl=en

- Data safety  
  https://support.google.com/googleplay/android-developer/answer/10787469?hl=en

- Permissions declaration  
  https://support.google.com/googleplay/android-developer/answer/9214102?hl=en

- Add preview assets  
  https://support.google.com/googleplay/android-developer/answer/9866151?hl=en

- Store listing best practices  
  https://support.google.com/googleplay/android-developer/answer/13393723?hl=en

- App signing  
  https://developer.android.com/guide/publishing/app-signing.html
