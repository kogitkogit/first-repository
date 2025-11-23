import api from "../api/client";
import { CATEGORY_OIL, CATEGORY_FILTER, CATEGORY_ETC } from "../constants/consumables";

const CATEGORY_META = {
  fuel: { key: "fuel", label: "주유", icon: "local_gas_station" },
  maintenance: { key: "maintenance", label: "정비", icon: "build_circle" },
  consumable: { key: "consumable", label: "소모품", icon: "inventory_2" },
  expenses: { key: "expenses", label: "기타 비용", icon: "receipt_long" },
};

const CONSUMABLE_CATEGORY_GROUPS = [
  { key: CATEGORY_OIL, label: "오일" },
  { key: CATEGORY_FILTER, label: "필터" },
  { key: CATEGORY_ETC, label: "기타 소모품" },
];

const safeListRequest = async (fetcher, label) => {
  try {
    const response = await fetcher();
    const data = response?.data;
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.items)) {
      return data.items;
    }
    return [];
  } catch (error) {
    console.error(`${label} 데이터를 불러오지 못했습니다.`, error);
    return [];
  }
};

const toDateKey = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return null;
};

const isWithinRange = (dateKey, startDate, endDate) => {
  if (!dateKey) return false;
  if (startDate && dateKey < startDate) return false;
  if (endDate && dateKey > endDate) return false;
  return true;
};

const mapMaintenanceRecord = (item) => ({
  ...item,
  service_date: item.service_date || item.date || toDateKey(item?.created_at) || toDateKey(item?.updated_at),
});

const getRecordDateKey = (item) =>
  toDateKey(item?.date) ||
  toDateKey(item?.service_date) ||
  toDateKey(item?.created_at) ||
  toDateKey(item?.updated_at);

export function calculateCostTotals({ fuel, maintenance, consumables, expenses }) {
  const totals = {
    fuel: fuel.reduce((sum, item) => sum + Number(item.price_total || 0), 0),
    maintenance: maintenance.reduce((sum, item) => sum + Number(item.cost || 0), 0),
    consumables: consumables.reduce((sum, item) => sum + Number(item.cost || 0), 0),
    expenses: expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
  };

  const categoryTotals = [
    {
      ...CATEGORY_META.fuel,
      amount: totals.fuel,
      count: fuel.length,
    },
    {
      ...CATEGORY_META.maintenance,
      amount: totals.maintenance,
      count: maintenance.length,
    },
    {
      ...CATEGORY_META.consumable,
      amount: totals.consumables,
      count: consumables.length,
    },
    {
      ...CATEGORY_META.expenses,
      amount: totals.expenses,
      count: expenses.length,
    },
  ];

  const overallTotal = categoryTotals.reduce((sum, item) => sum + item.amount, 0);
  return { totals, categoryTotals, overallTotal };
}

export async function fetchCostSnapshot({
  vehicleId,
  startDate,
  endDate,
  apiClient = api,
}) {
  if (!vehicleId) {
    throw new Error("vehicleId is required to fetch cost snapshot");
  }

  const params = { vehicleId };

  const expensesAll = await safeListRequest(
    () => apiClient.get("/expenses/list", { params }),
    "기타 비용",
  );

  const fuelAll = await safeListRequest(
    () => apiClient.get("/fuel/list", { params }),
    "주유 기록",
  );

  const maintenanceRaw = await safeListRequest(
    () =>
      apiClient.get("/maintenance/records", {
        params: {
          ...params,
          ...(startDate ? { fromDate: startDate } : {}),
          ...(endDate ? { toDate: endDate } : {}),
        },
      }),
    "정비 이력",
  );

  const [consumablesOilRaw, consumablesFilterRaw, consumablesEtcRaw] = await Promise.all([
    safeListRequest(
      () => apiClient.get("/consumables/search", { params: { ...params, category: CATEGORY_OIL } }),
      "오일 소모품",
    ),
    safeListRequest(
      () => apiClient.get("/consumables/search", { params: { ...params, category: CATEGORY_FILTER } }),
      "필터 소모품",
    ),
    safeListRequest(
      () => apiClient.get("/consumables/search", { params: { ...params, category: CATEGORY_ETC } }),
      "기타 소모품",
    ),
  ]);

  const consumablesRaw = [
    [consumablesOilRaw, CONSUMABLE_CATEGORY_GROUPS[0]],
    [consumablesFilterRaw, CONSUMABLE_CATEGORY_GROUPS[1]],
    [consumablesEtcRaw, CONSUMABLE_CATEGORY_GROUPS[2]],
  ].flatMap(([rows, group]) =>
    rows.map((row) => ({
      ...row,
      __groupKey: group.key,
      __groupLabel: group.label,
    })),
  );

  const maintenanceAll = maintenanceRaw.map(mapMaintenanceRecord);

  const filterInRange = (items, extractor) => {
    if (!startDate && !endDate) return items;
    return items.filter((item) => isWithinRange(extractor(item), startDate, endDate));
  };

  const expenses = filterInRange(expensesAll, (item) => getRecordDateKey(item));
  const fuel = filterInRange(fuelAll, (item) => getRecordDateKey(item));
  const maintenance = filterInRange(maintenanceAll, (item) => getRecordDateKey(item));
  const consumables = filterInRange(consumablesRaw, (item) => getRecordDateKey(item));

  const consumableDetails = CONSUMABLE_CATEGORY_GROUPS.map((group) => {
    const rows = consumables.filter((item) => item.__groupKey === group.key);
    return {
      key: group.key,
      label: group.label,
      amount: rows.reduce((sum, item) => sum + Number(item.cost || 0), 0),
      count: rows.length,
      rows,
    };
  });

  const { totals, categoryTotals, overallTotal } = calculateCostTotals({
    fuel,
    maintenance,
    consumables,
    expenses,
  });

  const entries = [
    ...fuel.map((item) => ({
      id: `fuel-${item.id}`,
      date: getRecordDateKey(item),
      amount: Number(item.price_total || 0),
      title: `${item.liters ?? "-"} L 주유`,
      detail: item.is_full ? "만땅 주유" : "부분 주유",
      categoryKey: CATEGORY_META.fuel.key,
      categoryLabel: CATEGORY_META.fuel.label,
      icon: CATEGORY_META.fuel.icon,
    })),
    ...maintenance.map((item) => ({
      id: `maintenance-${item.id}`,
      date: getRecordDateKey(item),
      amount: Number(item.cost || 0),
      title: item.title || "정비",
      detail: item.shop_name || item.service_type || "",
      categoryKey: CATEGORY_META.maintenance.key,
      categoryLabel: CATEGORY_META.maintenance.label,
      icon: CATEGORY_META.maintenance.icon,
    })),
    ...consumables.map((item) => ({
      id: `consumable-${item.id}`,
      date: getRecordDateKey(item),
      amount: Number(item.cost || 0),
      title: item.kind || item.__groupLabel,
      detail: item.__groupLabel,
      categoryKey: CATEGORY_META.consumable.key,
      categoryLabel: CATEGORY_META.consumable.label,
      icon: CATEGORY_META.consumable.icon,
    })),
    ...expenses.map((item) => ({
      id: `expense-${item.id}`,
      date: getRecordDateKey(item),
      amount: Number(item.amount || 0),
      title: item.type || "기타 비용",
      detail: item.memo || "",
      categoryKey: CATEGORY_META.expenses.key,
      categoryLabel: CATEGORY_META.expenses.label,
      icon: CATEGORY_META.expenses.icon,
    })),
  ].sort((a, b) => {
    const aKey = a.date || "";
    const bKey = b.date || "";
    if (aKey === bKey) return 0;
    return aKey > bKey ? -1 : 1;
  });

  return {
    totals,
    categoryTotals,
    overallTotal,
    entries,
    consumableDetails,
    raw: {
      expenses,
      fuel,
      maintenance,
      consumables,
    },
  };
}
