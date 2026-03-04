# Supabase 설정 상세 가이드 (2번 이후) - FastAPI/SQLAlchemy 기준

> 대상: `C:\Users\sss54\Desktop\python\carcare\git`  
> 전제: Supabase 프로젝트는 이미 생성 완료된 상태

---

## 2) DB 연결 문자열 찾기 (상세)

### 2-1. Supabase 콘솔 진입

1. Supabase 로그인
2. 해당 프로젝트 클릭
3. 좌측 메뉴에서 `Project Settings` 클릭
4. `Database` 탭 클릭

### 2-2. Connection String 위치

1. `Connection string` 섹션 찾기
2. URI 형식의 문자열 확인
3. `Host`, `Database name`, `Port`, `User` 값도 함께 확인

### 2-3. FastAPI(SQLAlchemy)용 최종 형식 만들기

이 프로젝트는 `psycopg2` 드라이버를 쓰므로 아래 형식 사용:

```txt
postgresql+psycopg2://<USER>:<PASSWORD>@<HOST>:<PORT>/<DB_NAME>?sslmode=require
```

보통 예시는 아래와 유사:

```txt
postgresql+psycopg2://postgres:<DB_PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require
```

### 2-4. 자주 실수하는 포인트

1. `postgresql://`만 쓰는 실수  
   - 이 프로젝트는 `postgresql+psycopg2://` 사용 권장
2. `sslmode=require` 누락  
   - 외부 연결 실패 원인이 될 수 있음
3. 비밀번호 특수문자 미인코딩  
   - `@`, `#`, `:` 포함 시 URL 인코딩 필요

### 2-5. 비밀번호 URL 인코딩 예시

비밀번호가 `Abc@123#`이면 인코딩 후:

```txt
Abc%40123%23
```

최종 URL 예:

```txt
postgresql+psycopg2://postgres:Abc%40123%23@db.xxxxx.supabase.co:5432/postgres?sslmode=require
```

---

## 3) 로컬 `.env` 반영 (상세)

### 3-1. 파일 위치

- 경로: `server/.env`

현재 저장소에는 `server/.env.example`이 있으므로 이를 참고해 `.env` 구성.

### 3-2. 필수 변수

```env
DATABASE_URL=postgresql+psycopg2://<USER>:<PASSWORD>@<HOST>:5432/postgres?sslmode=require
JWT_SECRET=<강한랜덤문자열>
JWT_ALG=HS256
```

### 3-3. 검증 체크

1. 공백/따옴표 실수 없음
2. 줄바꿈 깨짐 없음
3. `DATABASE_URL` 앞뒤 공백 없음

---

## 4) 로컬 연결 테스트 (상세)

### 4-1. 의존성 설치

```bash
cd server
pip install -r requirements.txt
```

### 4-2. 서버 실행

```bash
uvicorn app:app --reload --port 8000
```

### 4-3. 1차 확인

1. 서버 부팅 시 DB 연결 에러가 없는지 확인
2. 브라우저에서 `http://127.0.0.1:8000/docs` 접속

### 4-4. 테이블 생성 확인

테이블이 아직 없다면:

```bash
python init_db.py
```

확인 항목:

1. 오류 없이 실행 완료
2. Supabase SQL Editor에서 테이블 생성 확인

### 4-5. 기능 API 확인

최소 아래 API 점검:

1. 회원가입/로그인
2. 차량 등록/조회
3. 정비/주유 기록 생성/조회

---

## 5) Render에 동일 값 반영 (상세)

### 5-1. Environment 변수 등록

Render Web Service -> `Environment`에서 추가:

1. `DATABASE_URL`
2. `JWT_SECRET`
3. `JWT_ALG=HS256`

### 5-2. 배포 후 검증

1. `https://<render-url>/docs` 접속
2. 로그인 API 테스트
3. 차량 조회 API 테스트
4. 로그에서 DB 연결 오류 없는지 확인

---

## 6) Supabase 운영 보안 체크

1. `DATABASE_URL`은 서버(Render)에서만 사용
2. 프론트(`web`)에 DB URL 직접 노출 금지
3. Supabase `service_role` 키를 프론트에 넣지 않기
4. 비밀번호/시크릿은 Git에 커밋 금지

---

## 7) 문제 발생 시 점검 순서

1. `DATABASE_URL` 문자열 오타 확인
2. 비밀번호 URL 인코딩 확인
3. `sslmode=require` 확인
4. Supabase 프로젝트가 일시 중지 상태인지 확인
5. Render ENV 재저장 후 수동 재배포

---

## 8) 즉시 실행용 최소 체크리스트

- [ ] Supabase `Database -> Connection string` 확인
- [ ] SQLAlchemy 형식 URL 완성 (`postgresql+psycopg2://...`)
- [ ] `server/.env` 반영
- [ ] 로컬 `uvicorn` 실행/`/docs` 확인
- [ ] `init_db.py` 필요 시 실행
- [ ] Render ENV 등록
- [ ] Render 배포 후 API 검증
