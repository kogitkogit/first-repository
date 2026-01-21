import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import PanelTabs from "./PanelTabs";

// --- Constants ---
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

const SUMMARY_RANGE_OPTIONS = [
  { key: "week", label: "주간", days: 7 },
  { key: "month", label: "월간", days: 30 },
  { key: "year", label: "연간", days: 365 },
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

// --- Main Component ---
export default function MaintenancePanel({ vehicle }) {
  const [activeTab, setActiveTab] = useState("summary");
  const [allRecords, setAllRecords] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summaryRange, setSummaryRange] = useState("month");
  const [summaryRecords, setSummaryRecords] = useState([]);

  const [serviceType, setServiceType] = useState("all");
  const [rangeFilter, setRangeFilter] = useState("3m");
  const [sortOption, setSortOption] = useState("recent");
  const [search, setSearch] = useState("");
  const [minCost, setMinCost] = useState("");
  const [maxCost, setMaxCost] = useState("");

  const [formModal, setFormModal] = useState({ open: false, mode: "create" });
  const [formValues, setFormValues] = useState(() => defaultForm(vehicle));
  const [detailSheet, setDetailSheet] = useState({ open: false, record: null });

  const isSummaryTab = activeTab === "summary";

  // --- Logic & Handlers ---
  const applyRecordFilters = useCallback(
    (items) => {
      let list = [...items];
      if (minCost) {
        const min = Number(minCost);
        if (Number.isFinite(min)) list = list.filter((item) => Number(item.cost || 0) >= min);
      }
      if (maxCost) {
        const max = Number(maxCost);
        if (Number.isFinite(max)) list = list.filter((item) => Number(item.cost || 0) <= max);
      }

      switch (sortOption) {
        case "oldest":
          list.sort((a, b) => new Date(a.service_date) - new Date(b.service_date));
          break;
        case "cost-desc":
          list.sort((a, b) => Number(b.cost || 0) - Number(a.cost || 0));
          break;
        case "cost-asc":
          list.sort((a, b) => Number(a.cost || 0) - Number(b.cost || 0));
          break;
        default:
          list.sort((a, b) => new Date(b.service_date) - new Date(a.service_date));
      }
      return list;
    },
    [minCost, maxCost, sortOption]
  );

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
      const baseList = Array.isArray(data) ? data : [];
      setAllRecords(baseList);
      setRecords(applyRecordFilters(baseList));
    } catch (error) {
      console.error("정비 이력을 불러오지 못했습니다.", error);
    } finally {
      setLoading(false);
    }
  }, [vehicle, serviceType, search, rangeFilter, applyRecordFilters]);

  const fetchSummary = useCallback(async () => {
    if (!vehicle) {
      setSummaryRecords([]);
      return;
    }
    try {
      const params = { vehicleId: vehicle.id };
      const period = resolveSummaryPeriod(summaryRange);
      if (period) {
        params.fromDate = period.fromDate;
        params.toDate = period.toDate;
      }
      const { data } = await api.get("/maintenance/records", { params });
      const list = Array.isArray(data) ? data : [];
      list.sort((a, b) => new Date(b.service_date) - new Date(a.service_date));
      setSummaryRecords(list);
    } catch (error) {
      console.error("정비 요약을 불러오는 중 오류가 발생했습니다.", error);
      setSummaryRecords([]);
    }
  }, [vehicle, summaryRange]);

  useEffect(() => { loadRecords(); }, [loadRecords]);
  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { setRecords(applyRecordFilters(allRecords)); }, [allRecords, applyRecordFilters]);

  const handleFormSubmit = async () => {
    if (!vehicle) return;
    setLoading(true);
    const payload = {
      service_date: formValues.service_date,
      title: formValues.title.trim(),
      service_type: formValues.service_type,
      cost: formValues.cost ? Number(formValues.cost) : 0,
      odometer_km: formValues.odometer_km ? Number(formValues.odometer_km) : null,
      shop_name: formValues.shop_name || undefined,
      notes: formValues.notes || undefined,
    };
    try {
      if (formModal.mode === "create") {
        await api.post("/maintenance/records", { ...payload, vehicle_id: vehicle.id });
      } else if (formModal.recordId) {
        await api.put(`/maintenance/records/${formModal.recordId}`, payload);
      }
      setFormModal({ open: false, mode: "create" });
      setDetailSheet({ open: false, record: null });
      await Promise.all([loadRecords(), fetchSummary()]);
    } catch (error) {
      alert("정비 기록을 저장하지 못했습니다. 입력값을 다시 확인해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (record) => {
    if (!record || !window.confirm("이 정비 기록을 삭제하시겠습니까?")) return;
    try {
      await api.delete(`/maintenance/records/${record.id}`);
      setDetailSheet({ open: false, record: null });
      await Promise.all([loadRecords(), fetchSummary()]);
    } catch (error) {
      alert("삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  const handleResetFilters = () => {
    setServiceType("all");
    setRangeFilter("3m");
    setSortOption("recent");
    setSearch("");
    setMinCost("");
    setMaxCost("");
  };

  const summaryStats = useMemo(() => {
    if (!summaryRecords.length) return { totalCost: 0, count: 0, lastRecord: null, averageCost: 0 };
    const totalCost = summaryRecords.reduce((sum, item) => sum + Number(item.cost || 0), 0);
    const count = summaryRecords.length;
    return { totalCost, count, lastRecord: summaryRecords[0], averageCost: Math.round(totalCost / count) };
  }, [summaryRecords]);

  // --- Render ---
  return (
    <div className="pb-28">
      <PanelTabs
        tabs={[
          { key: "summary", label: "요약보기", icon: "insights" },
          { key: "details", label: "상세보기", icon: "list_alt" },
        ]}
        activeKey={activeTab}
        onChange={setActiveTab}
      />
      <div className="px-4 pt-0 pb-3">
        <div className="flex justify-end">
          <button
            className="flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-white shadow-card transition hover:bg-primary/90"
            onClick={() => {
              setFormValues(defaultForm(vehicle));
              setFormModal({ open: true, mode: "create" });
            }}
          >
            <span className="material-symbols-outlined text-base">add</span>
            정비 이력 추가
          </button>
        </div>
      </div>
  
      {/* 3. 본문 영역 */}
      <div className="space-y-6 px-4">
      {isSummaryTab ? (
        <div className="space-y-4">
          <section className="rounded-2xl border border-border-light bg-surface-light p-5 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <span className="material-symbols-outlined text-xl">build_circle</span>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-subtext-light">정비 요약</p>
                  <h1 className="mt-1 text-xl font-bold text-text-light">{vehicle?.maker} {vehicle?.model}</h1>
                  <p className="text-sm text-subtext-light">선택한 기간 기준으로 정비 지표를 확인하세요.</p>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-subtext-light bg-white px-3 py-1.5 rounded-full border border-border-light shadow-sm">
                <span className="font-semibold text-text-light">조회 기간</span>
                <select
                  value={summaryRange}
                  onChange={(e) => setSummaryRange(e.target.value)}
                  className="bg-transparent text-sm text-text-light focus:outline-none"
                >
                  {SUMMARY_RANGE_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <SummaryCard 
              title={`${getSummaryRangeLabel(summaryRange)} 총 비용`} 
              value={`${summaryStats.totalCost.toLocaleString()} 원`}
              icon="payments"
              color="bg-amber-100 text-amber-700"
            />
            <SummaryCard 
              title="정비 건수" 
              value={`${summaryStats.count}건`} 
              caption="선택한 기간 기준"
              icon="receipt_long"
              color="bg-sky-100 text-sky-700"
            />
            <SummaryCard 
              title="마지막 정비일" 
              value={summaryStats.lastRecord?.service_date || "-"} 
              caption={summaryStats.lastRecord?.title || "기록 없음"}
              icon="event"
              color="bg-emerald-100 text-emerald-700"
            />
            <SummaryCard 
              title="평균 비용" 
              value={`${summaryStats.averageCost.toLocaleString()} 원`} 
              caption={summaryStats.count ? `${summaryStats.count}건 기준` : "기록 없음"}
              icon="insights"
              color="bg-indigo-100 text-indigo-700"
            />
          </section>
        </div>
      ) : (
        <>
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                {SERVICE_FILTERS.map((f) => (
                  <button key={f.key} className={`rounded-full px-3 py-1 text-sm font-semibold ${serviceType === f.key ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-600"}`} onClick={() => setServiceType(f.key)}>{f.label}</button>
                ))}
                <input className="ml-auto min-w-[160px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="정비 항목/정비소 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {RANGE_FILTERS.map((f) => (
                  <button key={f.key} className={`rounded-full px-3 py-1 text-xs font-semibold ${rangeFilter === f.key ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600"}`} onClick={() => setRangeFilter(f.key)}>{f.label}</button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <input type="number" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="최소 비용" value={minCost} onChange={(e) => setMinCost(e.target.value)} />
                <input type="number" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="최대 비용" value={maxCost} onChange={(e) => setMaxCost(e.target.value)} />
                <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                  {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
                <button onClick={handleResetFilters} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:text-blue-600">필터 초기화</button>
              </div>
            </section>
            <section className="space-y-3">
              {loading ? (
                <div className="p-6 text-center text-sm text-slate-500">데이터를 불러오는 중입니다...</div>
              ) : records.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">정비 기록이 없습니다.</div>
              ) : (
                records.map((r) => <RecordCard key={r.id} record={r} onClick={() => setDetailSheet({ open: true, record: r })} />)
              )}
            </section>
          </>
        )}
      </div>

      {/* --- Modals --- */}
      {formModal.open && (
        <Modal
          title={formModal.mode === "create" ? "정비 기록 추가" : "정비 기록 수정"}
          onClose={() => setFormModal({ open: false, mode: "create" })}
          actions={
            <div className="space-y-3">
              <button className={PRIMARY_BUTTON} disabled={loading} onClick={handleFormSubmit}>저장하기</button>
              <button className={SECONDARY_BUTTON} onClick={() => setFormModal({ open: false, mode: "create" })}>취소</button>
            </div>
          }
        >
          <div className="space-y-3">
            <input type="date" className={INPUT_CLASS} value={formValues.service_date} onChange={(e) => setFormValues(p => ({ ...p, service_date: e.target.value }))} />
            <input className={INPUT_CLASS} placeholder="정비 항목" value={formValues.title} onChange={(e) => setFormValues(p => ({ ...p, title: e.target.value }))} />
            <select className={INPUT_CLASS} value={formValues.service_type} onChange={(e) => setFormValues(p => ({ ...p, service_type: e.target.value }))}>
              <option value="scheduled">정기 정비</option>
              <option value="unscheduled">돌발/특별 정비</option>
            </select>
            <input type="number" className={INPUT_CLASS} placeholder="비용 (원)" value={formValues.cost} onChange={(e) => setFormValues(p => ({ ...p, cost: e.target.value }))} />
            <input type="number" className={INPUT_CLASS} placeholder="주행거리 (km)" value={formValues.odometer_km} onChange={(e) => setFormValues(p => ({ ...p, odometer_km: e.target.value }))} />
            <input className={INPUT_CLASS} placeholder="정비소 이름" value={formValues.shop_name} onChange={(e) => setFormValues(p => ({ ...p, shop_name: e.target.value }))} />
            <textarea className={TEXTAREA_CLASS} placeholder="메모" value={formValues.notes} onChange={(e) => setFormValues(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </Modal>
      )}

      {detailSheet.open && detailSheet.record && (
        <BottomSheet onClose={() => setDetailSheet({ open: false, record: null })}>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-500">정비 날짜 / 항목</p>
              <p className="text-lg font-bold">{detailSheet.record.service_date}</p>
              <p className="text-base font-semibold">{detailSheet.record.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="비용" value={formatCurrency(detailSheet.record.cost)} />
              <InfoRow label="주행거리" value={detailSheet.record.odometer_km ? `${Number(detailSheet.record.odometer_km).toLocaleString()} km` : "-"} />
              <InfoRow label="정비소" value={detailSheet.record.shop_name || "-"} />
            </div>
            {detailSheet.record.notes && <div className="p-3 bg-slate-50 rounded-xl text-sm whitespace-pre-line">{detailSheet.record.notes}</div>}
            <div className="grid grid-cols-2 gap-2">
              <button className={SECONDARY_BUTTON} onClick={() => { setFormValues({ ...detailSheet.record, cost: String(detailSheet.record.cost || ""), odometer_km: String(detailSheet.record.odometer_km || "") }); setFormModal({ open: true, mode: "edit", recordId: detailSheet.record.id }); }}>수정</button>
              <button className="inline-flex w-full items-center justify-center rounded-xl bg-red-50 text-red-600 px-4 py-2 text-sm font-semibold" onClick={() => handleDelete(detailSheet.record)}>삭제</button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

// --- Helper Components & Functions (Remain similar but cleaned) ---
function SummaryCard({ title, value, caption, icon = "insights", color = "bg-primary/10 text-primary" }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border-light bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`flex h-9 w-9 items-center justify-center rounded-full ${color}`}>
          <span className="material-symbols-outlined text-lg">{icon}</span>
        </span>
        <span className="text-sm font-semibold text-text-light">{title}</span>
      </div>
      <div>
        <p className="text-lg font-bold text-text-light">{value}</p>
        {caption && <p className="text-xs text-subtext-light">{caption}</p>}
      </div>
    </div>
  );
}

function RecordCard({ record, onClick }) {
  return (
    <button className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-blue-400" onClick={onClick}>
      <div className="flex justify-between">
        <div>
          <p className="text-xs text-slate-500">{record.service_date}</p>
          <p className="font-semibold text-slate-900">{record.title}</p>
        </div>
        <span className="font-bold text-blue-600">{Number(record.cost || 0).toLocaleString()} 원</span>
      </div>
    </button>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-[11px] text-slate-500 uppercase">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function Modal({ title, onClose, children, actions }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose}><span className="material-symbols-outlined">close</span></button>
        </div>
        {children}
        <div className="mt-6">{actions}</div>
      </div>
    </div>
  );
}

function BottomSheet({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl overflow-y-auto max-h-[80vh]">
        <div className="flex justify-end mb-2">
          <button onClick={onClose}><span className="material-symbols-outlined">close</span></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// --- Utils ---
function resolveRange(rangeKey) {
  const target = RANGE_FILTERS.find((item) => item.key === rangeKey);
  if (!target || !target.months) return null;
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - target.months);
  return { fromDate: start.toISOString().slice(0, 10), toDate: end.toISOString().slice(0, 10) };
}

function resolveSummaryPeriod(rangeKey) {
  const end = new Date();
  let start = new Date();
  if (rangeKey === "week") start.setDate(end.getDate() - 7);
  else if (rangeKey === "month") start.setDate(end.getDate() - 30);
  else if (rangeKey === "year") start.setFullYear(end.getFullYear() - 1);
  else return null;
  return { fromDate: start.toISOString().slice(0, 10), toDate: end.toISOString().slice(0, 10) };
}

function getSummaryRangeLabel(rangeKey) {
  return SUMMARY_RANGE_OPTIONS.find(o => o.key === rangeKey)?.label || "기간";
}

function formatCurrency(value) {
  return value != null ? `${Number(value).toLocaleString()} 원` : "-";
}
