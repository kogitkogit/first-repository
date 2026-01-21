import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import PanelTabs from "./PanelTabs";

// --- Constants ---
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

const INPUT_CLASS = "block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";
const PRIMARY_BUTTON = "inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700 disabled:opacity-60";
const SECONDARY_BUTTON = "inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60";

const defaultForm = (vehicle) => ({
  date: new Date().toISOString().slice(0, 10),
  liters: "",
  price_total: "",
  odo_km: vehicle?.odo_km ? String(vehicle.odo_km) : "",
  is_full: true,
});

export default function FuelPanel({ vehicle, onCostDataChanged = () => {} }) {
  const [activeTab, setActiveTab] = useState("summary");
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [rangeFilter, setRangeFilter] = useState("3m");
  const [onlyFull, setOnlyFull] = useState(false);
  const [summaryRange, setSummaryRange] = useState("month");
  const [formModal, setFormModal] = useState({ open: false, mode: "create" });
  const [formValues, setFormValues] = useState(() => defaultForm(vehicle));
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);

  const isSummaryTab = activeTab === "summary";

  // --- Effects ---
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [vehicle?.id, activeTab]);

  useEffect(() => {
    if (vehicle) fetchRecords();
  }, [vehicle]);

  useEffect(() => {
    applyFilters();
  }, [records, rangeFilter, onlyFull]);

  // --- Logic ---
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/fuel/list", { params: { vehicleId: vehicle.id } });
      const list = (data || []).sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecords(list);
    } catch (error) {
      console.error("주유 기록을 불러오지 못했습니다.", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    const range = resolveRange(rangeFilter);
    let list = [...records];
    if (range) {
      list = list.filter((item) => {
        const dateKey = String(item.date).slice(0, 10);
        return dateKey >= range.fromDate && dateKey <= range.toDate;
      });
    }
    if (onlyFull) {
      list = list.filter((item) => item.is_full);
    }
    setFilteredRecords(list);
  };

  const summaryStats = useMemo(() => {
    const period = resolveSummaryPeriod(summaryRange);
    const summaryList = period 
      ? records.filter(item => {
          const d = String(item.date).slice(0, 10);
          return d >= period.fromDate && d <= period.toDate;
        })
      : records;

    if (!summaryList.length) return { totalCost: 0, count: 0, avgCost: 0, lastRecord: null };
    
    const totalCost = summaryList.reduce((sum, item) => sum + Number(item.price_total || 0), 0);
    const count = summaryList.length;
    const sorted = [...summaryList].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return { 
      totalCost, 
      count, 
      avgCost: Math.round(totalCost / count), 
      lastRecord: sorted[0] 
    };
  }, [records, summaryRange]);

  const handleSubmit = async () => {
    if (!vehicle) return;
    const payload = {
      vehicle_id: vehicle.id,
      date: formValues.date,
      liters: Number(formValues.liters),
      price_total: Number(formValues.price_total),
      odo_km: Number(formValues.odo_km),
      is_full: !!formValues.is_full,
    };
    try {
      if (formModal.mode === "edit" && formModal.recordId) {
        await api.put(`/fuel/${formModal.recordId}`, payload);
      } else {
        await api.post("/fuel/add", payload);
      }
      setFormModal({ open: false, mode: "create" });
      fetchRecords();
      onCostDataChanged?.();
    } catch (error) {
      alert("기록 저장에 실패했습니다.");
    }
  };

  const handleDelete = async (record) => {
    if (!record || !window.confirm("이 주유 기록을 삭제하시겠습니까?")) return;
    try {
      await api.delete(`/fuel/${record.id}`);
      fetchRecords();
      onCostDataChanged?.();
    } catch (error) {
      alert("삭제에 실패했습니다.");
    }
  };

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
            주유 기록 추가
          </button>
        </div>
      </div>

      {/* 3. Content Body (여백 최적화) */}
      <div className="space-y-6 px-4">
        {isSummaryTab ? (
          <div className="space-y-4">
            <section className="rounded-2xl border border-border-light bg-surface-light p-5 shadow-card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                    <span className="material-symbols-outlined text-xl">local_gas_station</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-subtext-light">주유 요약</p>
                    <h1 className="mt-1 text-xl font-bold text-text-light">{vehicle?.maker} {vehicle?.model}</h1>
                    <p className="text-sm text-subtext-light">선택한 기간 기준으로 주유 지표를 확인하세요.</p>
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
                title={`${getSummaryRangeLabel(summaryRange)} 총 주유비`} 
                value={`${summaryStats.totalCost.toLocaleString()} 원`}
                icon="payments"
                color="bg-amber-100 text-amber-700"
              />
              <SummaryCard 
                title="주유 건수" 
                value={`${summaryStats.count}건`} 
                caption="선택한 기간 기준"
                icon="receipt_long"
                color="bg-sky-100 text-sky-700"
              />
              <SummaryCard 
                title="마지막 주유일" 
                value={summaryStats.lastRecord?.date || "-"} 
                caption={summaryStats.lastRecord ? `${summaryStats.lastRecord.liters}L 충전` : "기록 없음"}
                icon="event"
                color="bg-emerald-100 text-emerald-700"
              />
              <SummaryCard 
                title="평균 주유비" 
                value={`${summaryStats.avgCost.toLocaleString()} 원`} 
                caption={summaryStats.count ? `${summaryStats.count}건 기준` : "기록 없음"}
                icon="insights"
                color="bg-indigo-100 text-indigo-700"
              />
            </section>
          </div>
        ) : (
          <>
            {/* 상세보기 필터 */}
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex flex-wrap gap-1.5">
                {RANGE_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${rangeFilter === f.key ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                    onClick={() => setRangeFilter(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyFull}
                  onChange={(e) => setOnlyFull(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                가득 주유만
              </label>
            </section>
            
            {/* 레코드 리스트 */}
            <section className="space-y-3">
              {loading ? (
                <div className="p-6 text-center text-sm text-slate-500">불러오는 중...</div>
              ) : filteredRecords.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">기록이 없습니다.</div>
              ) : (
                filteredRecords.map((r) => (
                  <FuelRecordCard key={r.id} record={r} onView={() => setSelectedRecord(r)} />
                ))
              )}
            </section>
          </>
        )}
      </div>

      {/* --- Modals & Sheets --- */}
      {formModal.open && (
        <Modal
          title={formModal.mode === "edit" ? "주유 기록 수정" : "주유 기록 추가"}
          onClose={() => setFormModal({ open: false, mode: "create" })}
          actions={<div className="space-y-3"><button className={PRIMARY_BUTTON} onClick={handleSubmit}>저장하기</button><button className={SECONDARY_BUTTON} onClick={() => setFormModal({ open: false })}>취소</button></div>}
        >
          <div className="space-y-3">
            <input type="date" className={INPUT_CLASS} value={formValues.date} onChange={(e) => setFormValues(p => ({ ...p, date: e.target.value }))} />
            <input type="number" className={INPUT_CLASS} placeholder="주유량 (L)" value={formValues.liters} onChange={(e) => setFormValues(p => ({ ...p, liters: e.target.value }))} />
            <input type="number" className={INPUT_CLASS} placeholder="총 금액 (원)" value={formValues.price_total} onChange={(e) => setFormValues(p => ({ ...p, price_total: e.target.value }))} />
            <input type="number" className={INPUT_CLASS} placeholder="주행거리 (km)" value={formValues.odo_km} onChange={(e) => setFormValues(p => ({ ...p, odo_km: e.target.value }))} />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={formValues.is_full} onChange={(e) => setFormValues(p => ({ ...p, is_full: e.target.checked }))} /> 만땅 주유
            </label>
          </div>
        </Modal>
      )}

      {selectedRecord && (
        <BottomSheet onClose={() => setSelectedRecord(null)}>
          <div className="space-y-4">
            <InfoRow label="주유 날짜" value={selectedRecord.date} />
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="주유량" value={`${selectedRecord.liters} L`} />
              <InfoRow label="금액" value={`${Number(selectedRecord.price_total).toLocaleString()} 원`} />
              <InfoRow label="주행거리" value={`${Number(selectedRecord.odo_km).toLocaleString()} km`} />
              <InfoRow label="만땅" value={selectedRecord.is_full ? "예" : "아니요"} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className={SECONDARY_BUTTON} onClick={() => { 
                setFormValues({ ...selectedRecord, liters: String(selectedRecord.liters), price_total: String(selectedRecord.price_total), odo_km: String(selectedRecord.odo_km) }); 
                setFormModal({ open: true, mode: "edit", recordId: selectedRecord.id });
                setSelectedRecord(null);
              }}>수정</button>
              <button className="rounded-xl bg-red-50 text-red-600 text-sm font-semibold" onClick={() => { handleDelete(selectedRecord); setSelectedRecord(null); }}>삭제</button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

// --- Sub-components ---
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

function FuelRecordCard({ record, onView }) {
  return (
    <button className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-blue-400" onClick={onView}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs text-slate-500">{record.date}</p>
          <p className="font-semibold text-slate-900">{record.liters} L · {Number(record.price_total).toLocaleString()} 원</p>
          <p className="text-xs text-slate-400 mt-1">{Number(record.odo_km).toLocaleString()} km · {record.is_full ? "가득" : "부분"}</p>
        </div>
        <span className="material-symbols-outlined text-slate-400">chevron_right</span>
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
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
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
  const target = RANGE_FILTERS.find(f => f.key === rangeKey);
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
