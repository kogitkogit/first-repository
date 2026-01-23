# 구글 플레이스토어 출시 절차 (Capacitor 기반)

> 대상: 현재 `web` 폴더(React + Vite)와 `server`(FastAPI)를 사용하는 CarCare 프로젝트를 **Capacitor로 Android 앱 패키징**하여 Google Play Console에 출시하는 절차입니다.
> 날짜 기준: 2026-01-23

---

## 0) 전제 조건/준비물

- Google Play Console 개발자 계정 (유료, 1회 결제)
- Android Studio 최신 버전 설치
- JDK 17 설치
- 프로젝트 빌드가 가능한 로컬 환경
- 백엔드 서버가 **외부에서 접근 가능한 HTTPS 도메인**을 갖추고 있어야 함

> **중요**: 스토어 배포 앱은 `http://127.0.0.1` 같은 로컬 API 주소를 사용할 수 없습니다. 반드시 **HTTPS 도메인**으로 교체해야 합니다.

---

## 1) 프로젝트 설정 확인 (Capacitor 기준)

### 1-1. API 주소 환경변수

`web/.env` 파일을 만들고 실제 서버 주소를 설정합니다.

```env
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

---

## 1-1a) HTTPS 도메인 준비 (API 서버 공개용)

> 목표: 모바일 앱이 어디서든 접근 가능한 **HTTPS API 도메인**을 준비합니다.  
> 예시 도메인: `https://api.yourdomain.com/api`

### 1-1a-1. 도메인 준비

- 도메인을 구매하거나 기존 도메인을 사용합니다.
- `api.yourdomain.com` 같은 **서브도메인**을 API 용도로 권장합니다.

### 1-1a-2. 서버에 API 배포

- FastAPI 서버를 인터넷에 노출 가능한 서버(예: Ubuntu VM)에 배포합니다.
- 방화벽에서 80/443 포트를 허용합니다.

#### 확인 방법

- 방화벽 상태 확인 (Ubuntu UFW 기준)

```bash
sudo ufw status
```

- 서버에서 FastAPI 프로세스 확인

```bash
ps aux | grep uvicorn
```

### 1-1a-3. 리버스 프록시(Nginx) 설정

1) Nginx 설치

```bash
sudo apt update
sudo apt install nginx
```

2) Nginx 사이트 설정 파일 생성

```bash
sudo nano /etc/nginx/sites-available/carcare-api
```

3) 아래 내용을 입력하고 저장합니다.

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

4) 심볼릭 링크 활성화 및 재시작

```bash
sudo ln -s /etc/nginx/sites-available/carcare-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 확인 방법

- Nginx 설정 테스트 결과에 `syntax is ok` / `test is successful`가 나와야 합니다.

```bash
sudo nginx -t
```

- Nginx 실행 상태 확인

```bash
sudo systemctl status nginx
```

### 1-1a-4. HTTPS 인증서 발급 (Let’s Encrypt)

1) Certbot 설치

```bash
sudo apt install certbot python3-certbot-nginx
```

2) 인증서 발급

```bash
sudo certbot --nginx -d api.yourdomain.com
```

3) 자동 갱신 확인

```bash
sudo certbot renew --dry-run
```

#### 확인 방법

- 인증서가 정상인지 확인

```bash
sudo certbot certificates
```

### 1-1a-5. FastAPI 실행 확인

- `http://127.0.0.1:8000`에서 FastAPI가 정상 실행 중인지 확인합니다.
- 외부에서 `https://api.yourdomain.com/api` 호출이 성공해야 합니다.

#### 확인 방법

- 서버 내부에서 로컬 호출 확인

```bash
curl -I http://127.0.0.1:8000
```

- 외부에서 HTTPS 호출 확인

```bash
curl -I https://api.yourdomain.com/api
```

### 1-1a-6. 앱 환경변수 반영

`web/.env`에 HTTPS 도메인을 넣고 다시 빌드합니다.

```env
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

#### 확인 방법

- 프론트 빌드 결과에 API 주소가 반영되는지 확인

```bash
cd web
npm run build
rg -n "VITE_API_BASE_URL|api.yourdomain.com" dist -S
```

---

## 1-1b) 무료 도메인(DuckDNS) 사용 절차 (테스트/초기 운영용)

> 목표: 유료 도메인 없이 `*.duckdns.org`로 HTTPS API 도메인을 구성한다.  
> 예시 도메인: `https://carcare-test.duckdns.org/api`

### 1-1b-1. DuckDNS 도메인 생성

1) https://www.duckdns.org 접속 후 로그인  
2) 원하는 서브도메인 생성 (예: `carcare-test`)
3) DuckDNS 대시보드에서 **Token**을 확인

### 1-1b-2. 도메인에 서버 IP 연결

DuckDNS 페이지의 `Domains` 항목에서 현재 서버 IP가 등록되어 있는지 확인합니다.

#### 확인 방법

- DuckDNS 대시보드에서 IP가 보이는지 확인
- 서버에서 DNS 확인

```bash
nslookup carcare-test.duckdns.org
```

### 1-1b-3. Let’s Encrypt 인증서 발급 (DuckDNS용)

DuckDNS 권장 방식은 **DNS 챌린지 + 인증서 자동 갱신**입니다.

1) 필요한 도구 설치

```bash
sudo apt update
sudo apt install certbot
```

2) DuckDNS 인증 스크립트 준비

```bash
mkdir -p /opt/duckdns
sudo nano /opt/duckdns/duck.sh
```

3) 아래 내용을 입력 (TOKEN/DOMAIN 교체)

```bash
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=carcare-test&token=YOUR_TOKEN&ip=" | curl -k -o /opt/duckdns/duck.log -K -
```

4) 실행 권한 부여 및 동작 확인

```bash
sudo chmod 700 /opt/duckdns/duck.sh
/opt/duckdns/duck.sh
```

5) DNS 챌린지 인증서 발급

```bash
sudo certbot certonly --manual \
  --preferred-challenges dns \
  --email you@example.com \
  --server https://acme-v02.api.letsencrypt.org/directory \
  --agree-tos \
  -d carcare-test.duckdns.org
```

> 인증 과정에서 TXT 레코드 값을 안내받으면 DuckDNS 대시보드에 수동으로 등록해야 합니다.

#### 확인 방법

- 인증서 목록 확인

```bash
sudo certbot certificates
```

- TXT 레코드 확인

```bash
nslookup -type=TXT _acme-challenge.carcare-test.duckdns.org
```

### 1-1b-4. Nginx에 DuckDNS 인증서 연결

```nginx
server {
    listen 443 ssl;
    server_name carcare-test.duckdns.org;

    ssl_certificate /etc/letsencrypt/live/carcare-test.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/carcare-test.duckdns.org/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 확인 방법

```bash
sudo nginx -t
sudo systemctl restart nginx
curl -I https://carcare-test.duckdns.org/api
```

### 1-1b-5. 앱 환경변수 반영

```env
VITE_API_BASE_URL=https://carcare-test.duckdns.org/api
```

#### 확인 방법

```bash
cd web
npm run build
rg -n "duckdns.org" dist -S
```

---

### 1-2. Capacitor 설정 확인

`web/capacitor.config.json`

- `appId`: 앱 고유 패키지명 (예: `com.carcare.app`)
- `appName`: 앱 표시 이름 (예: `CarCare`)
- `webDir`: `dist`

---

## 2) 프론트 빌드 및 Android 동기화

아래 명령을 순서대로 실행합니다.

```bash
cd web
npm install
npm run build
npm run cap:sync
```

> `cap:sync`는 빌드된 `dist`를 Android 프로젝트로 복사합니다.

---

## 3) Android Studio에서 앱 열기

```bash
npm run cap:open:android
```

Android Studio가 열리면 아래를 확인합니다.

- Gradle Sync 정상 완료
- Android Manifest 에 INTERNET 권한 확인
- 앱 실행(에뮬레이터 또는 실기기)

#### 확인 방법

- INTERNET 권한 확인

`web/android/app/src/main/AndroidManifest.xml`에 아래가 있어야 합니다.

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

- 실제 기기에서 API 호출이 성공하는지 확인  
  (로그에 200 응답이 찍히는지 확인)

---

## 4) 앱 아이콘/스플래시 교체

### 4-1. 앱 아이콘

Android Studio에서 `mipmap` 리소스를 교체합니다.

경로 예시:

```
web/android/app/src/main/res/mipmap-*
```

### 4-2. 스플래시 화면

`capacitor.config.json`에 설정을 반영했고, Android에서는 아래 경로를 사용합니다.

```
web/android/app/src/main/res/drawable
```

> 필요 시 Android Studio의 `Launch Screen` 설정에서 디자인을 수정합니다.

---

## 5) 앱 서명 키 생성 (Release Key)

### 5-1. 키 생성

```bash
keytool -genkeypair -v \
  -keystore carcare-release.keystore \
  -alias carcare \
  -keyalg RSA -keysize 2048 -validity 10000
```

### 5-2. 키 파일 보관

- 생성된 `.keystore` 파일은 **절대 분실하면 안 됨**
- 팀 내 안전한 보관 필요

---

## 6) Gradle에 서명 설정 추가

`web/android/app/build.gradle`에 서명 정보를 추가합니다.

```gradle
android {
    signingConfigs {
        release {
            storeFile file('carcare-release.keystore')
            storePassword '비밀번호'
            keyAlias 'carcare'
            keyPassword '비밀번호'
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            shrinkResources false
        }
    }
}
```

> 실제 비밀번호는 로컬에서만 관리하고 Git에 절대 올리지 않습니다.

#### 확인 방법

- 릴리즈 빌드가 서명 오류 없이 완료되는지 확인합니다.

---

## 7) Release 빌드 생성 (AAB)

Google Play는 **AAB(Android App Bundle)** 업로드를 요구합니다.

```bash
cd web/android
./gradlew bundleRelease
```

빌드 결과:

```
web/android/app/build/outputs/bundle/release/app-release.aab
```

#### 확인 방법

- AAB 파일이 실제로 생성됐는지 확인합니다.

```bash
ls web/android/app/build/outputs/bundle/release/
```

---

## 8) Google Play Console 준비

### 8-1. 앱 등록

- Google Play Console 접속
- **새 앱 만들기**
- 기본 정보 입력 (앱 이름/언어/카테고리)

### 8-2. 스토어 등록정보 입력

필수 항목:
- 앱 이름
- 간단 설명
- 자세한 설명
- 스크린샷 (휴대폰 최소 2장)
- 앱 아이콘 (512x512)
- 기능 그래픽 (1024x500)

---

## 9) 앱 콘텐츠/정책

Google 정책상 필수로 아래 항목을 입력해야 합니다.

- 개인정보처리방침 URL
- 데이터 수집/처리 관련 설문
- 앱 액세스 관련 안내 (로그인 필요 여부)
- 광고 포함 여부

---

## 10) AAB 업로드 및 출시

### 10-1. 내부 테스트(Internal Testing) 권장

- 테스트 트랙 생성
- AAB 업로드
- 테스터 이메일 등록
- 실제 설치 확인

### 10-2. 프로덕션 출시

- 새 프로덕션 릴리스 생성
- AAB 업로드
- 출시 검토 요청

---

## 11) 출시 후 점검

- 크래시/ANR 모니터링
- 사용자 리뷰 대응
- 업데이트 버전 관리

---

## 12) 자주 발생하는 문제

### 12-1. API 주소 문제
- `127.0.0.1` 사용 시 배포 앱에서 서버 호출 불가
- 반드시 외부 HTTPS 주소로 변경

### 12-2. 키스토어 분실
- 키를 잃으면 기존 앱 업데이트 불가

### 12-3. 스토어 심사 거절
- 개인정보처리방침 누락
- 스크린샷 품질 부족
- 기능 설명 미흡

---

## 13) 체크리스트

- [ ] 앱 아이콘/스플래시 교체
- [ ] API 주소 HTTPS 반영
- [ ] AAB 빌드 성공
- [ ] 스토어 등록정보 완료
- [ ] 정책 항목 완료
- [ ] 내부 테스트 완료
- [ ] 프로덕션 출시 요청

---

## 14) 참고

- Google Play Console: https://play.google.com/console
- Capacitor 공식 문서: https://capacitorjs.com/docs

