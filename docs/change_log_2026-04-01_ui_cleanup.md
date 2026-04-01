# 2026-04-01 변경 추적

## 범위
- `web/src/App.jsx`
- `web/src/components/Dashboard.jsx`
- `web/src/components/InitialSetupGuide.jsx`
- `web/src/components/FuelPanel.jsx`
- `web/src/components/OilPanel.jsx`
- `web/src/components/FilterPanel.jsx`
- `web/src/components/OtherConsumablesPanel.jsx`
- `web/src/components/SettingsPanel.jsx`
- `server/api/charging.py`
- `server/models/ChargingRecord.py`
- `server/models/Vehicle.py`
- `server/schemas/charging.py`
- `server/app.py`
- `server/init_db.py`
- `server/migrate_to_supabase.py`

## 이번 작업

### 1. 초기 설정 가이드 추가
- 차량 첫 진입 시 `초기 설정 가이드` 화면이 먼저 열리도록 라우팅 추가
- 안내 항목:
  - 주행거리
  - 보험/검사
  - 첫 주유/충전
  - 오일/필터/소모품 초기값
- 우측 상단 `X` 버튼으로 닫기 가능
- 하단 `주행거리 입력하기` 버튼 클릭 시 대시보드의 주행거리 입력 UI가 바로 열리도록 연결

### 2. EV / PHEV 충전 기록 기능 구현
- `charging_records` 테이블 추가
- 백엔드 API 추가
  - `GET /api/charging/list`
  - `POST /api/charging/add`
  - `PUT /api/charging/{id}`
  - `DELETE /api/charging/{id}`
  - `GET /api/charging/stats`
- `FuelPanel`에서 연료 타입에 따라 화면 분기
  - `gasoline / diesel / hybrid`: 주유
  - `phev`: 주유 + 충전 탭
  - `ev`: 충전 전용
- 충전 탭 UI는 주유 탭과 동일한 카드/모달 흐름으로 구성

### 3. 최근값 복사 추가
- `FuelPanel`
  - 최근 주유 기록 복사
  - 최근 충전 기록 복사
- `OilPanel`
- `FilterPanel`
- `OtherConsumablesPanel`
- 복사 동작은 입력창에만 반영되고, 저장 전까지 DB에는 반영되지 않도록 유지

### 4. 설정 탭 운영 정보 확장
- 임시 연락처 제거 상태 유지
- 설정 탭에 다음 항목 추가
  - 앱 버전
  - 백업
  - 복구
  - 정책 및 운영 안내

### 5. 대시보드 보완
- 초기 설정 가이드에서 돌아왔을 때 주행거리 입력 UI 자동 오픈
- EV는 충전 전비, PHEV는 충전 집계 기준으로 에너지 카드 문구 보완

## DB 반영
- `charging_records` 테이블 생성 완료
- 인덱스 생성 완료

## 검증
- 프론트 `npm run build` 통과
- 백엔드 `app`, `api.charging`, `models.ChargingRecord` import 통과
