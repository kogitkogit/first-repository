import { useEffect, useMemo, useState } from "react";
import api from "../api/client";

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

const defaultForm = (vehicle) => ({
  date: new Date().toISOString().slice(0, 10),
  liters: "",
  price_total: "",
  odo_km: vehicle?.odo_km ? String(vehicle.odo_km) : "",
  is_full: true,
});

export default function FuelPanel({ vehicle, onCostDataChanged = () => {} }) {

  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [rangeFilter, setRangeFilter] = useState("3m");
  const [onlyFull, setOnlyFull] = useState(false);
  const [summaryRange, setSummaryRange] = useState("month");
  const [formModal, setFormModal] = useState({ open: false, mode: "create" });
  const [formValues, setFormValues] = useState(() => defaultForm(vehicle));
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!vehicle) return;
    setFormValues(defaultForm(vehicle));
  }, [vehicle]);

  useEffect(() => {
    if (!vehicle) return;
    fetchRecords();
  }, [vehicle]);

  useEffect(() => {
    applyFilters();
  }, [records, rangeFilter, onlyFull]);

  const summaryRecords = useMemo(() => {
    const period = resolveSummaryPeriod(summaryRange);
    if (!period) return records;
    return records.filter((item) => {
      const dateKey = String(item.date).slice(0, 10);
      return dateKey >= period.fromDate && dateKey <= period.toDate;
    });
  }, [records, summaryRange]);

  const summaryStats = useMemo(() => {
    if (!summaryRecords.length) {
      return { totalCost: 0, count: 0, avgCost: 0, lastRecord: null };
    }
    const totalCost = summaryRecords.reduce(
      (sum, item) => sum + Number(item.price_total || 0),
      0,
    );
    const count = summaryRecords.length;
    const avgCost = Math.round(totalCost / count);
    const sorted = [...summaryRecords].sort(
      (a, b) => new Date(b.date) - new Date(a.date),
    );
    return { totalCost, count, avgCost, lastRecord: sorted[0] };
  }, [summaryRecords]);

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

  const summary = useMemo(() => {
    if (!filteredRecords.length) {
      return {
        totalCost: 0,
        totalLiters: 0,
        avgPricePerLiter: 0,
        lastFill: null,
      };
    }
    const totalCost = filteredRecords.reduce((sum, item) => sum + Number(item.price_total || 0), 0);
    const totalLiters = filteredRecords.reduce((sum, item) => sum + Number(item.liters || 0), 0);
    const avgPricePerLiter = totalLiters ? Math.round(totalCost / totalLiters) : 0;
    const lastFill = filteredRecords[0];
    return { totalCost, totalLiters, avgPricePerLiter, lastFill };
  }, [filteredRecords]);

  const handleSubmit = async () => {
    if (!vehicle) return;
    if (!formValues.date || !formValues.liters || !formValues.price_total || !formValues.odo_km) {
      alert("모든 필수 항목을 입력해주세요.");
      return;
    }
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
      setFormValues(defaultForm(vehicle));
      await Promise.all([fetchRecords(), fetchStats()]);
      onCostDataChanged?.();
    } catch (error) {
      console.error("주유 기록 저장 중 오류", error);
      alert("주유 기록을 저장하지 못했습니다.");
    }
  };

  const handleDelete = async (record) => {
    if (!record) return;
    if (!window.confirm("이 주유 기록을 삭제하시겠습니까?")) return;
    try {
      await api.delete(`/fuel/${record.id}`);
      await Promise.all([fetchRecords(), fetchStats()]);
      onCostDataChanged?.();
    } catch (error) {
      console.error("주유 기록 삭제 중 오류", error);
      alert("삭제에 실패했습니다. 잠시 뒤 다시 시도해주세요.");
    }
  };

  const openCreate = () => {
    setFormValues(defaultForm(vehicle));
    setFormModal({ open: true, mode: "create" });
  };

  const openEdit = (record) => {
    setFormValues({
      date: record.date,
      liters: record.liters != null ? String(record.liters) : "",
      price_total: record.price_total != null ? String(record.price_total) : "",
      odo_km: record.odo_km != null ? String(record.odo_km) : "",
      is_full: !!record.is_full,
    });
    setFormModal({ open: true, mode: "edit", recordId: record.id });
  };

  return (
    <div className="pb-28 space-y-6">
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-surface-light p-5 shadow-sm">
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">주유 관리</h1>
            <p className="text-sm text-slate-600">주유 이력을 추가하고 비용 변화를 확인해보세요.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 sm:w-auto"
              onClick={openCreate}
            >
              <span className="material-symbols-outlined text-base">add</span>
              주유 기록 추가
            </button>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-800">조회 기간</span>
              <select
                value={summaryRange}
                onChange={(e) => setSummaryRange(e.target.value)}
                className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {SUMMARY_RANGE_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              title={`${getSummaryRangeLabel(summaryRange)} 총 주유비`}
              value={summaryStats.totalCost ? `${summaryStats.totalCost.toLocaleString()} 원` : "0 원"}
              caption={`${summaryStats.count}건의 주유 기록`}
            />
            <SummaryCard
              title="주유 건수"
              value={`${summaryStats.count}건`}
              caption="선택한 기간 기준"
            />
            <SummaryCard
              title="마지막 주유일"
              value={summaryStats.lastRecord?.date || "-"}
              caption={summaryStats.lastRecord ? `${summaryStats.lastRecord.liters}L · ${Number(summaryStats.lastRecord.price_total || 0).toLocaleString()} 원` : "최근 주유 기록이 없습니다"}
            />
            <SummaryCard
              title="평균 주유비"
              value={summaryStats.avgCost ? `${summaryStats.avgCost.toLocaleString()} 원` : "0 원"}
              caption={summaryStats.count ? `${summaryStats.count}건 기준` : "기록 없음"}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {RANGE_FILTERS.map((filter) => (
            <button
              key={filter.key}
              className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                rangeFilter === filter.key ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-600"
              }`}
              onClick={() => setRangeFilter(filter.key)}
            >
              {filter.label}
            </button>
          ))}
          <label className="ml-auto inline-flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={onlyFull}
              onChange={(e) => setOnlyFull(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            가득 주유만 보기
          </label>
        </div>
      </section>

      <section className="space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500 shadow-sm">
            데이터를 불러오는 중입니다...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500 shadow-sm">
            조건에 맞는 주유 기록이 없습니다. 새 기록을 추가해보세요.
          </div>
        ) : (
          filteredRecords.map((record) => (
            <FuelRecordCard
              key={record.id}
              record={record}
              onView={() => setSelectedRecord(record)}
              onEdit={() => openEdit(record)}
              onDelete={() => handleDelete(record)}
            />
          ))
        )}
      </section>

      {formModal.open && (
        <Modal
          title={formModal.mode === "edit" ? "주유 기록 수정" : "주유 기록 추가"}
          onClose={() => setFormModal({ open: false, mode: "create" })}
          actions={
            <div className="space-y-3">
              <button className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700" onClick={handleSubmit}>
                저장하기
              </button>
              <button
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
              value={formValues.date}
              onChange={(e) => setFormValues((prev) => ({ ...prev, date: e.target.value }))}
              required
            />
            <input
              type="number"
              className={INPUT_CLASS}
              placeholder="주유량 (L)"
              value={formValues.liters}
              onChange={(e) => setFormValues((prev) => ({ ...prev, liters: e.target.value }))}
              required
            />
            <input
              type="number"
              className={INPUT_CLASS}
              placeholder="총 금액 (원)"
              value={formValues.price_total}
              onChange={(e) => setFormValues((prev) => ({ ...prev, price_total: e.target.value }))}
              required
            />
            <input
              type="number"
              className={INPUT_CLASS}
              placeholder="주행거리 (km)"
              value={formValues.odo_km}
              onChange={(e) => setFormValues((prev) => ({ ...prev, odo_km: e.target.value }))}
              required
            />
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={formValues.is_full}
                onChange={(e) => setFormValues((prev) => ({ ...prev, is_full: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              만땅 주유
            </label>
          </div>
        </Modal>
      )}

      {selectedRecord && (
        <FuelDetailSheet
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onEdit={() => {
            openEdit(selectedRecord);
            setSelectedRecord(null);
          }}
          onDelete={() => {
            handleDelete(selectedRecord);
            setSelectedRecord(null);
          }}
        />
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

function SummaryCard({ title, value, caption }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-[16px] font-bold text-slate-900">{value}</p>
      {caption ? <p className="mt-1 text-[10px] text-slate-500">{caption}</p> : null}
    </div>
  );
}

function FuelRecordCard({ record, onView, onEdit, onDelete }) {
  const cost = Number(record.price_total || 0);
  const liters = Number(record.liters || 0);
  const unitPrice = liters ? Math.round(cost / liters) : null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-400 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">{record.date}</p>
          <p className="mt-1 text-base font-semibold text-slate-900">{liters.toFixed(1)} L · {cost.toLocaleString()} 원</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold">{record.odo_km.toLocaleString()} km</span>
            <span className={`rounded-full px-2.5 py-0.5 font-semibold ${record.is_full ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
              {record.is_full ? "만땅" : "부분"}
            </span>
            {unitPrice ? <span>{unitPrice.toLocaleString()} 원/L</span> : null}
          </div>
        </div>
        <div className="flex flex-col gap-2 text-sm text-blue-600">
          <button type="button" className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-blue-500 hover:text-blue-600" onClick={onView}>
            상세
          </button>
          <button type="button" className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-blue-500 hover:text-blue-600" onClick={onEdit}>
            수정
          </button>
          <button type="button" className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50" onClick={onDelete}>
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children, actions }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button className="text-slate-500" onClick={onClose} aria-label="모달 닫기">
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
        <div className="mt-4 space-y-3">{children}</div>
        <div className="mt-6">{actions}</div>
      </div>
    </div>
  );
}

function FuelDetailSheet({ record, onClose, onEdit, onDelete }) {
  const cost = Number(record.price_total || 0);
  const liters = Number(record.liters || 0);
  const unitPrice = liters ? Math.round(cost / liters) : null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-end">
          <button className="text-slate-500" onClick={onClose} aria-label="상세 닫기">
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs text-slate-500">주유 날짜</p>
            <p className="text-lg font-semibold text-slate-900">{record.date}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label="주유량" value={`${liters.toFixed(1)} L`} />
            <InfoRow label="총 금액" value={`${cost.toLocaleString()} 원`} />
            <InfoRow label="주행거리" value={`${record.odo_km.toLocaleString()} km`} />
            <InfoRow label="만땅 여부" value={record.is_full ? "예" : "아니요"} />
            <InfoRow label="리터당 가격" value={unitPrice ? `${unitPrice.toLocaleString()} 원` : "-"} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blue-500 hover:text-blue-600"
              onClick={onEdit}
            >
              수정하기
            </button>
            <button
              type="button"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
              onClick={onDelete}
            >
              삭제하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}





function resolveSummaryPeriod(rangeKey) {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let start;
  switch (rangeKey) {
    case "week":
      start = new Date(end);
      start.setDate(end.getDate() - 6);
      break;
    case "month":
      start = new Date(end);
      start.setDate(end.getDate() - 29);
      break;
    case "year":
      start = new Date(end);
      start.setFullYear(end.getFullYear() - 1);
      start.setDate(start.getDate() + 1);
      break;
    default:
      return null;
  }
  return {
    fromDate: start.toISOString().slice(0, 10),
    toDate: end.toISOString().slice(0, 10),
  };
}

function getSummaryRangeLabel(rangeKey) {
  const option = SUMMARY_RANGE_OPTIONS.find((item) => item.key === rangeKey);
  return option ? option.label : "기간";
}

