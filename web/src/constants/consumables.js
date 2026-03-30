export const CATEGORY_OIL = "오일";
export const CATEGORY_FILTER = "필터";
export const CATEGORY_ETC = "소모품";

export const OIL_DEFAULT_ITEMS = [
  { kind: "엔진오일", mode: "distance", cycleKm: 5000, cycleMonths: 6, icon: "oil_barrel" },
  { kind: "미션오일", mode: "distance", cycleKm: 40000, cycleMonths: 24, icon: "settings" },
  { kind: "브레이크액", mode: "time", cycleKm: 40000, cycleMonths: 24, icon: "water_drop" },
  { kind: "부동액", mode: "time", cycleKm: 40000, cycleMonths: 24, icon: "ac_unit" },
];

export const FILTER_DEFAULT_ITEMS = [
  { kind: "엔진오일 필터", mode: "distance", cycleKm: 5000, cycleMonths: 6, icon: "filter_alt" },
  { kind: "에어 필터", mode: "distance", cycleKm: 15000, cycleMonths: 12, icon: "air" },
  { kind: "캐빈 필터", mode: "time", cycleKm: 0, cycleMonths: 12, icon: "airwave" },
  { kind: "연료 필터(가솔린)", mode: "distance", cycleKm: 40000, cycleMonths: 24, icon: "local_gas_station" },
  { kind: "연료 필터(디젤)", mode: "distance", cycleKm: 20000, cycleMonths: 12, icon: "local_shipping" },
];

export const ETC_DEFAULT_ITEMS = [
  { kind: "브레이크 패드", mode: "distance", cycleKm: 40000, cycleMonths: 36, icon: "disc_full" },
  { kind: "브레이크 디스크(로터)", mode: "distance", cycleKm: 80000, cycleMonths: 60, icon: "tire_repair" },
  { kind: "배터리", mode: "time", cycleKm: 0, cycleMonths: 48, icon: "battery_full" },
  { kind: "와이퍼 블레이드", mode: "time", cycleKm: 0, cycleMonths: 12, icon: "rainy" },
  { kind: "에어컨 필터", mode: "time", cycleKm: 0, cycleMonths: 12, icon: "mode_fan" },
  { kind: "스파크 플러그", mode: "distance", cycleKm: 80000, cycleMonths: 48, icon: "bolt" },
  { kind: "타이밍 벨트", mode: "distance", cycleKm: 100000, cycleMonths: 60, icon: "precision_manufacturing" },
];

export const CONSUMABLE_CATEGORY_META = [
  { key: "oil", category: CATEGORY_OIL, panelLabel: "오일 관리", notificationType: "oil", defaults: OIL_DEFAULT_ITEMS },
  { key: "filter", category: CATEGORY_FILTER, panelLabel: "필터 관리", notificationType: "filter", defaults: FILTER_DEFAULT_ITEMS },
  { key: "etc", category: CATEGORY_ETC, panelLabel: "소모품 관리", notificationType: "consumable", defaults: ETC_DEFAULT_ITEMS },
];
