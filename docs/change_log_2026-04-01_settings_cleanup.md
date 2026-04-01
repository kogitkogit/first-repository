# 2026-04-01 설정/할 일/에너지 패널 정리

## 대상 파일
- `web/src/components/FuelPanel.jsx`
- `web/src/components/TasksPanel.jsx`
- `web/src/components/SettingsPanel.jsx`

## 반영 내용
- `FuelPanel`
  - 깨진 한국어 문자열을 정상 문구로 정리
  - `fuelType` 기반 주유/충전 분기 유지
  - PHEV의 `주유/충전` 탭 구조 유지
  - EV의 충전 전용 기록 흐름 유지
  - 최근값 복사, 중앙 모달, 기본 `가득 주유만 보기` 해제 상태 유지
- `TasksPanel`
  - 초기 설정 가이드/긴급 항목/작성 필요 항목 문구 정리
  - 긴급 항목 우선 정렬과 패널 이동 기능 유지
  - 초기 설정 완료 시 자동 접힘 동작 유지
- `SettingsPanel`
  - 알림 설정 문구 정리
  - 운영 정보 영역 정리
  - 앱 버전을 `1.1.0`으로 반영
  - 백업/복구 설명을 현재 Supabase 기준으로 명시
  - 개인정보처리방침 모달 추가

## 정책 문서 연결
- 원문 기준 정책 문서: `docs/privacy_policy.md`
- 앱 설정 탭에서 요약/원문 기준 안내를 확인할 수 있도록 연결
