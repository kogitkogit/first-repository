import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/client";

const SERVICE_FILTERS = [
  { key: "all", label: "전체" },
  { key: "scheduled", label: "정기 정비" },
  { key: "unscheduled", label: "비정기 정비" },
];

const RANGE_FILTERS = [
  { key: "1m", label: "최근 1개월", months: 1 },
  { key: "3m", label: "최근 3개월", months: 3 },
  { key: "6m", label: "최근 6개월", months: 6 },
  { key: "12m", label: "최근 1년", months: 12 },
  { key: "all", label: "전체", months: null },
];

const SORT_OPTIONS = [
  { key: "recent", label: "최신순" },
  { key: "oldest", label: "오래된순" },
  { key: "cost-desc", label: "비용 높은순" },
  { key: "cost-asc", label: "비용 낮은순" },
];

const INPUT_CLASS =
  "block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";
const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[96px]`;
const PRIMARY_BUTTON =
  "inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700 disabled:opacity-60";
const SECONDARY_BUTTON =
  "inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60";

const defaultForm = (vehicle) => ({
  service_date: new Date().toISOString().slice(0, 10),
  title: "",
  service_type: "scheduled",
  cost: "",
  odometer_km: vehicle?.odo_km ? String(vehicle.odo_km) : "",
  shop_name: "",
  notes: "",
});

export default function MaintenancePanel({ vehicle }) {
  const [overview, setOverview] = useState(null);
  const [allRecords, setAllRecords] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const [serviceType, setServiceType] = useState("all");
  const [rangeFilter, setRangeFilter] = useState("3m");
  const [sortOption, setSortOption] = useState("recent");
  const [search, setSearch] = useState("");
  const [minCost, setMinCost] = useState("");
  const [maxCost, setMaxCost] = useState("");

  const [formModal, setFormModal] = useState({ open: false, mode: "create" });
  const [formValues, setFormValues] = useState(() => defaultForm(vehicle));
  const [detailSheet, setDetailSheet] = useState({ open: false, record: null });

  const totalCostMonth = useMemo(() => {
    if (!overview) return 0;
    return Number(overview.total_cost_month ?? 0);
  }, [overview]);

  const applyRecordFilters = useCallback(
    (items) => {
      let list = [...items];

      if (minCost) {
        const min = Number(minCost);
        if (Number.isFinite(min)) {
          list = list.filter((item) => Number(item.cost || 0) >= min);
        }
      }
      if (maxCost) {
        const max = Number(maxCost);
        if (Number.isFinite(max)) {
          list = list.filter((item) => Number(item.cost || 0) <= max);
        }
      }

      switch (sortOption) {
        case "oldest":
          list.sort(
            (a, b) => new Date(a.service_date) - new Date(b.service_date)
          );
          break;
        case "cost-desc":
          list.sort((a, b) => Number(b.cost || 0) - Number(a.cost || 0));
          break;
        case "cost-asc":
          list.sort((a, b) => Number(a.cost || 0) - Number(b.cost || 0));
          break;
        default:
          list.sort(
            (a, b) => new Date(b.service_date) - new Date(a.service_date)
          );
      }
      return list;
    },
    [minCost, maxCost, sortOption]
  );

  const highlightStats = useMemo(() => {
    if (!records.length) return null;
    const totalCost = records.reduce(
      (sum, item) => sum + Number(item.cost || 0),
      0
    );
    const averageCost = Math.round(totalCost / records.length);
    const shopCounter = records.reduce((map, item) => {
      if (!item.shop_name) return map;
      map[item.shop_name] = (map[item.shop_name] || 0) + 1;
      return map;
    }, {});
    const frequentShop = Object.entries(shopCounter).sort(
      (a, b) => b[1] - a[1]
    )[0];
    const unscheduledCount = records.filter(
      (item) => item.service_type === "unscheduled"
    ).length;
    const ratio = records.length
      ? Math.round((unscheduledCount / records.length) * 100)
      : 0;
    return {
      averageCost,
      frequentShop: frequentShop ? frequentShop[0] : null,
      unscheduledRatio: ratio,
    };
  }, [records]);

  const loadOverview = useCallback(async () => {
    if (!vehicle) return;
    try {
      const { data } = await api.get("/maintenance/overview", {
        params: { vehicleId: vehicle.id },
      });
      setOverview(data);
    } catch (error) {
      console.error("정비 요약 정보를 불러오지 못했습니다.", error);
    }
  }, [vehicle]);

  const loadRecords = useCallback(async () => {
    if (!vehicle) return;
    setLoading(true);
    try {
      const params = { vehicleId: vehicle.id };
      if (serviceType !== "all") params.serviceType = serviceType;
      if (search.trim()) params.search = search.trim();

      const range = resolveRange(rangeFilter);
      if (range) {
        params.fromDate = range.fromDate;
        params.toDate = range.toDate;
      }

      const { data } = await api.get("/maintenance/records", { params });
      const baseList = data || [];
      setAllRecords(baseList);
      setRecords(applyRecordFilters(baseList));
    } catch (error) {
      console.error("정비 이력을 불러오지 못했습니다.", error);
    } finally {
      setLoading(false);
    }
  }, [vehicle, serviceType, search, rangeFilter, applyRecordFilters]);

  useEffect(() => {
    if (!vehicle) return;
    setFormValues(defaultForm(vehicle));
  }, [vehicle]);

  useEffect(() => {
    if (!vehicle) return;
    loadOverview();
  }, [vehicle, loadOverview]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    setRecords(applyRecordFilters(allRecords));
  }, [allRecords, applyRecordFilters]);

  const handleFormSubmit = async () => {
    if (!vehicle) return;
    setLoading(true);
    const payload = {
      service_date: formValues.service_date,
      title: formValues.title.trim(),
      service_type: formValues.service_type,
      cost: formValues.cost ? Number(formValues.cost) : 0,
      odometer_km: formValues.odometer_km
        ? Number(formValues.odometer_km)
        : null,
      shop_name: formValues.shop_name || undefined,
      notes: formValues.notes || undefined,
    };
    try {
      if (formModal.mode === "create") {
        await api.post("/maintenance/records", {
          ...payload,
          vehicle_id: vehicle.id,
        });
      } else if (formModal.recordId) {
        await api.put(`/maintenance/records/${formModal.recordId}`, payload);
      }
      setFormModal({ open: false, mode: "create" });
      setDetailSheet({ open: false, record: null });
      await Promise.all([loadRecords(), loadOverview()]);
    } catch (error) {
      console.error("정비 기록 저장 중 오류가 발생했습니다.", error);
      alert(
        "정비 기록을 저장하지 못했습니다. 입력값을 다시 확인해주세요."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (record) => {
    if (!record) return;
    if (!window.confirm("이 정비 기록을 삭제하시겠습니까?")) return;
    try {
      await api.delete(`/maintenance/records/${record.id}`);
      setDetailSheet({ open: false, record: null });
      await Promise.all([loadRecords(), loadOverview()]);
    } catch (error) {
      console.error("정비 기록 삭제 중 오류가 발생했습니다.", error);
      alert("삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  const handleDuplicate = (record) => {
    if (!record) return;
    setFormValues({
      service_date: new Date().toISOString().slice(0, 10),
      title: record.title,
      service_type: record.service_type,
      cost: record.cost != null ? String(record.cost) : "",
      odometer_km:
        record.odometer_km != null ? String(record.odometer_km) : "",
      shop_name: record.shop_name || "",
      notes: record.notes || "",
    });
    setFormModal({ open: true, mode: "create" });
  };

  const handleResetFilters = () => {
    setServiceType("all");
    setRangeFilter("3m");
    setSortOption("recent");
    setSearch("");
    setMinCost("");
    setMaxCost("");
  };

  return (
    <div className="pb-28 space-y-6">      <section className="rounded-3xl border border-border-light bg-surface-light p-6 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-light">정비 이력 관리</h1>
            <p className="mt-1 text-sm text-subtext-light">정비 이력을 추가하고 필요한 정보를 빠르게 확인하세요.</p>
          </div>
          <button
            type="button"
            className="flex w-3/4 mx-auto items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 lg:w-auto"
            onClick={() => {
              setFormValues(defaultForm(vehicle));
              setFormModal({ open: true, mode: "create" });
            }}
          >
            <span className="material-symbols-outlined text-base">add</span>
            정비 이력 추가
          </button>
        </div>

        <div className="mt-6 grid gap-2 grid-cols-4">
          <SummaryCard
            title="이번 달 총 비용"
            value={totalCostMonth ? `${totalCostMonth.toLocaleString()} 원` : "0 원"}
          />
          <SummaryCard
            title="정비 건수"
            value={overview ? overview.total_count_month : 0}
            caption={
              overview
                ? `${overview.scheduled_count_month}건 정기, ${overview.unscheduled_count_month}건 비정기`
                : "-"
            }
          />
          <SummaryCard
            title="마지막 정비일"
            value={overview?.last_service_date || "-"}
            caption={overview?.recent?.[0]?.title || "최근 기록이 없습니다"}
          />
          <SummaryCard
            title="평균 정비 비용"
            value={
              highlightStats
                ? `${highlightStats.averageCost.toLocaleString()} 원`
                : "-"
            }
            caption={
              highlightStats?.frequentShop
                ? `${highlightStats.frequentShop} · 비정기 비율 ${highlightStats.unscheduledRatio}%`
                : "정보가 없습니다"
            }
          />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {SERVICE_FILTERS.map((filter) => (
            <button
              key={filter.key}
              className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                serviceType === filter.key
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 text-slate-600"
              }`}
              onClick={() => setServiceType(filter.key)}
            >
              {filter.label}
            </button>
          ))}
          <input
            className="ml-auto min-w-[160px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="정비 항목이나 정비소 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {RANGE_FILTERS.map((filter) => (
            <button
              key={filter.key}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                rangeFilter === filter.key
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 text-slate-600"
              }`}
              onClick={() => setRangeFilter(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs text-slate-600">
            최소 비용 (원)
            <input
              type="number"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={minCost}
              onChange={(e) => setMinCost(e.target.value)}
              placeholder="예: 50000"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-600">
            최대 비용 (원)
            <input
              type="number"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={maxCost}
              onChange={(e) => setMaxCost(e.target.value)}
              placeholder="예: 300000"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-600">
            정렬 방식
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center">
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:border-blue-500 hover:text-blue-600"
            >
              필터 초기화
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500 shadow-sm">
            데이터를 불러오는 중입니다...
          </div>
        ) : records.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500 shadow-sm">
            조건에 해당하는 정비 기록이 없습니다. 필터를 변경하거나 새 기록을 추가해보세요.
          </div>
        ) : (
          records.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              onClick={() => setDetailSheet({ open: true, record })}
            />
          ))
        )}
      </section>

      {formModal.open && (
        <Modal
          title={formModal.mode === "create" ? "정비 기록 추가" : "정비 기록 수정"}
          onClose={() => setFormModal({ open: false, mode: "create" })}
          actions={
            <div className="space-y-3">
              <button
                className={PRIMARY_BUTTON}
                disabled={loading}
                onClick={handleFormSubmit}
              >
                저장하기
              </button>
              <button
                className={SECONDARY_BUTTON}
                disabled={loading}
                onClick={() => setFormModal({ open: false, mode: "create" })}
              >
                취소
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <input
              type="date"
              className={INPUT_CLASS}
              value={formValues.service_date}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  service_date: e.target.value,
                }))
              }
              required
            />
            <input
              className={INPUT_CLASS}
              placeholder="정비 항목"
              value={formValues.title}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, title: e.target.value }))
              }
              required
            />
            <select
              className={INPUT_CLASS}
              value={formValues.service_type}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  service_type: e.target.value,
                }))
              }
            >
              <option value="scheduled">정기 정비</option>
              <option value="unscheduled">돌발/특별 정비</option>
            </select>
            <input
              type="number"
              className={INPUT_CLASS}
              placeholder="비용 (원)"
              value={formValues.cost}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, cost: e.target.value }))
              }
            />
            <input
              type="number"
              className={INPUT_CLASS}
              placeholder="주행거리 (km)"
              value={formValues.odometer_km}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  odometer_km: e.target.value,
                }))
              }
            />
            <input
              className={INPUT_CLASS}
              placeholder="정비소 이름"
              value={formValues.shop_name}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  shop_name: e.target.value,
                }))
              }
            />
            <textarea
              className={TEXTAREA_CLASS}
              placeholder="메모"
              value={formValues.notes}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, notes: e.target.value }))
              }
            />
          </div>
        </Modal>
      )}

      {detailSheet.open && detailSheet.record && (
        <BottomSheet
          onClose={() => setDetailSheet({ open: false, record: null })}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                정비 날짜
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {detailSheet.record.service_date}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                정비 항목
              </p>
              <p className="text-base font-semibold text-slate-900">
                {detailSheet.record.title}
              </p>
              <Badge>
                {detailSheet.record.service_type === "scheduled"
                  ? "정기 정비"
                  : "돌발 정비"}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <InfoRow
                label="비용"
                value={formatCurrency(detailSheet.record.cost)}
              />
              <InfoRow
                label="주행거리"
                value={
                  detailSheet.record.odometer_km != null
                    ? `${Number(
                        detailSheet.record.odometer_km
                      ).toLocaleString()} km`
                    : "-"
                }
              />
              <InfoRow
                label="정비소"
                value={detailSheet.record.shop_name || "-"}
              />
              <InfoRow
                label="평균 비용 대비"
                value={
                  highlightStats
                    ? compareCost(
                        detailSheet.record.cost,
                        highlightStats.averageCost
                      )
                    : "-"
                }
              />
            </div>

            {detailSheet.record.notes && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-semibold">메모</p>
                <p className="mt-1 whitespace-pre-line">
                  {detailSheet.record.notes}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <button
                type="button"
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-500 hover:text-blue-600"
                onClick={() => handleDuplicate(detailSheet.record)}
              >
                동일한 정비 다시 등록
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-500 hover:text-blue-600"
                  onClick={() => {
                    setFormValues({
                      service_date: detailSheet.record.service_date,
                      title: detailSheet.record.title,
                      service_type: detailSheet.record.service_type,
                      cost:
                        detailSheet.record.cost != null
                          ? String(detailSheet.record.cost)
                          : "",
                      odometer_km:
                        detailSheet.record.odometer_km != null
                          ? String(detailSheet.record.odometer_km)
                          : "",
                      shop_name: detailSheet.record.shop_name || "",
                      notes: detailSheet.record.notes || "",
                    });
                    setFormModal({
                      open: true,
                      mode: "edit",
                      recordId: detailSheet.record.id,
                    });
                  }}
                >
                  수정하기
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                  onClick={() => handleDelete(detailSheet.record)}
                >
                  삭제하기
                </button>
              </div>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

function resolveRange(rangeKey) {
  const target = RANGE_FILTERS.find((item) => item.key === rangeKey);
  if (!target || !target.months) return null;
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - target.months);
  return {
    fromDate: start.toISOString().slice(0, 10),
    toDate: end.toISOString().slice(0, 10),
  };
}

function formatCurrency(value) {
  if (value == null) return "-";
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return `${num.toLocaleString()} 원`;
}

function compareCost(cost, average) {
  if (
    cost == null ||
    !Number.isFinite(Number(cost)) ||
    !Number.isFinite(Number(average))
  )
    return "-";
  const diff = Number(cost) - Number(average);
  if (diff === 0) return "평균과 동일";
  return diff > 0
    ? `평균보다 ${Math.abs(diff).toLocaleString()}원 높음`
    : `평균보다 ${Math.abs(diff).toLocaleString()}원 낮음`;
}

function SummaryCard({ title, value, caption }) {
  return (
    <div className="rounded-2xl border border-border-light bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-subtext-light">{title}</p>
      <p className="mt-2 text-xl font-bold text-text-light">{value}</p>
      {caption ? <p className="mt-1 text-[10px] text-subtext-light">{caption}</p> : null}
    </div>
  );
}

function RecordCard({ record, onClick }) {
  const cost = Number(record.cost || 0);
  return (
    <button
      type="button"
      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-400 hover:shadow-md"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">{record.service_date}</p>
          <p className="mt-1 text-base font-semibold text-slate-900">
            {record.title}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <Badge
              variant={record.service_type === "scheduled" ? "primary" : "neutral"}
            >
              {record.service_type === "scheduled" ? "정기" : "돌발"}
            </Badge>
            {record.shop_name ? <span>{record.shop_name}</span> : null}
            {record.odometer_km != null ? (
              <span>{Number(record.odometer_km).toLocaleString()} km</span>
            ) : null}
          </div>
        </div>
        <span className="text-base font-bold text-blue-600">
          {cost ? `${cost.toLocaleString()} 원` : "-"}
        </span>
      </div>
      {record.notes ? (
        <p className="mt-2 line-clamp-2 text-sm text-slate-600">
          {record.notes}
        </p>
      ) : null}
    </button>
  );
}

function Badge({ children, variant = "primary" }) {
  const classes =
    variant === "primary"
      ? "rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700"
      : "rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700";
  return <span className={classes}>{children}</span>;
}

function InfoRow({ label, value }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function Modal({ title, onClose, children, actions }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            className="text-slate-500"
            onClick={onClose}
            aria-label="모달 닫기"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
        <div className="mt-4 space-y-3">{children}</div>
        <div className="mt-6">{actions}</div>
      </div>
    </div>
  );
}

function BottomSheet({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="h-[75vh] w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-xl sm:h-auto sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
          <button
            className="text-slate-500"
            onClick={onClose}
            aria-label="시트 닫기"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
