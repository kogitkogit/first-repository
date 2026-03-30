import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import ConfirmDialog from "./ui/ConfirmDialog";
import { useToast } from "./ui/ToastProvider";

const RANGE_FILTERS = [
  { key: "1m", label: "최근 1개월", months: 1 },
  { key: "3m", label: "최근 3개월", months: 3 },
  { key: "6m", label: "최근 6개월", months: 6 },
  { key: "12m", label: "최근 1년", months: 12 },
  { key: "all", label: "전체", months: null },
];

const INPUT_CLASS =
  "block w-full rounded-xl border border-border-light bg-background-light px-3 py-2 text-sm text-text-light placeholder:text-subtext-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

const defaultForm = (vehicle) => ({
  date: new Date().toISOString().slice(0, 10),
  liters: "",
  price_total: "",
  odo_km: vehicle?.odo_km ? String(vehicle.odo_km) : "",
  is_full: true,
});

function resolveRange(rangeKey) {
  const target = RANGE_FILTERS.find((item) => item.key === rangeKey);
  if (!target || !target.months) return null;
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - target.months);
  return { fromDate: start.toISOString().slice(0, 10), toDate: end.toISOString().slice(0, 10) };
}

function SummaryCard({ title, value, caption }) {
  return (
    <div className="rounded-2xl border border-border-light bg-background-light p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-subtext-light">{title}</p>
      <p className="mt-2 text-xl font-bold text-text-light">{value}</p>
      {caption ? <p className="mt-1 text-[11px] text-subtext-light">{caption}</p> : null}
    </div>
  );
}

function Modal({ title, onClose, children, actions }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-0 sm:items-center sm:justify-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-surface-light p-6 shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-light">{title}</h2>
          <button className="text-subtext-light" onClick={onClose} aria-label="닫기">
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
        <div className="mt-4 space-y-3">{children}</div>
        <div className="mt-6">{actions}</div>
      </div>
    </div>
  );
}

function FuelRecordCard({ record, onView, onEdit, onDelete }) {
  const cost = Number(record.price_total || 0);
  const liters = Number(record.liters || 0);
  const unitPrice = liters ? Math.round(cost / liters) : null;

  return (
    <div className="rounded-2xl border border-border-light bg-surface-light p-4 shadow-sm transition hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-subtext-light">{record.date}</p>
          <p className="mt-1 text-base font-semibold text-text-light">
            {liters.toFixed(1)}L · {cost.toLocaleString()}원
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-subtext-light">
            <span className="rounded-full bg-background-light px-2.5 py-0.5 font-semibold">{Number(record.odo_km || 0).toLocaleString()}km</span>
            <span className={`rounded-full px-2.5 py-0.5 font-semibold ${record.is_full ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-700"}`}>{record.is_full ? "만땅 주유" : "부분 주유"}</span>
            {unitPrice ? <span>리터당 {unitPrice.toLocaleString()}원</span> : null}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" className="rounded-full border border-border-light px-3 py-1 text-xs font-semibold text-subtext-light transition hover:text-primary" onClick={onView}>상세</button>
          <button type="button" className="rounded-full border border-border-light px-3 py-1 text-xs font-semibold text-subtext-light transition hover:text-primary" onClick={onEdit}>수정</button>
          <button type="button" className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50" onClick={onDelete}>삭제</button>
        </div>
      </div>
    </div>
  );
}

function FuelDetailSheet({ record, onClose, onEdit, onDelete }) {
  const cost = Number(record.price_total || 0);
  const liters = Number(record.liters || 0);
  const unitPrice = liters ? Math.round(cost / liters) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="h-[70vh] w-full max-w-lg rounded-t-3xl bg-surface-light p-6 shadow-xl sm:h-auto sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="h-1.5 w-12 rounded-full bg-border-light sm:hidden" />
          <button className="text-subtext-light" onClick={onClose} aria-label="닫기">
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <p className="text-xs text-subtext-light">주유 날짜</p>
            <p className="text-lg font-semibold text-text-light">{record.date}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label="주유량" value={`${liters.toFixed(1)}L`} />
            <InfoRow label="총 금액" value={`${cost.toLocaleString()}원`} />
            <InfoRow label="주행거리" value={`${Number(record.odo_km || 0).toLocaleString()}km`} />
            <InfoRow label="주유 방식" value={record.is_full ? "만땅" : "부분"} />
            <InfoRow label="리터당 단가" value={unitPrice ? `${unitPrice.toLocaleString()}원` : "-"} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="rounded-xl border border-border-light px-4 py-2 text-sm font-semibold text-subtext-light transition hover:text-primary" onClick={onEdit}>수정</button>
            <button type="button" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100" onClick={onDelete}>삭제</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-wide text-subtext-light">{label}</p>
      <p className="text-sm font-semibold text-text-light">{value}</p>
    </div>
  );
}

export default function FuelPanel({ vehicle, onCostDataChanged = () => {} }) {
  const { showToast } = useToast();
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [rangeFilter, setRangeFilter] = useState("3m");
  const [onlyFull, setOnlyFull] = useState(true);
  const [formModal, setFormModal] = useState({ open: false, mode: "create" });
  const [formValues, setFormValues] = useState(() => defaultForm(vehicle));
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!vehicle) return;
    setFormValues(defaultForm(vehicle));
  }, [vehicle]);

  useEffect(() => {
    if (!vehicle) return;
    fetchStats();
    fetchRecords();
  }, [vehicle]);

  useEffect(() => {
    const range = resolveRange(rangeFilter);
    let list = [...records];
    if (range) {
      list = list.filter((item) => {
        const dateKey = String(item.date).slice(0, 10);
        return dateKey >= range.fromDate && dateKey <= range.toDate;
      });
    }
    if (onlyFull) list = list.filter((item) => item.is_full);
    setFilteredRecords(list);
  }, [records, rangeFilter, onlyFull]);

  const fetchStats = async () => {
    try {
      const { data } = await api.get("/fuel/stats", { params: { vehicleId: vehicle.id } });
      setStats(data);
    } catch (error) {
      console.error("주유 통계를 불러오지 못했습니다.", error);
    }
  };

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

  const summary = useMemo(() => {
    if (!filteredRecords.length) {
      return { totalCost: 0, totalLiters: 0, avgPricePerLiter: 0, lastFill: null };
    }
    const totalCost = filteredRecords.reduce((sum, item) => sum + Number(item.price_total || 0), 0);
    const totalLiters = filteredRecords.reduce((sum, item) => sum + Number(item.liters || 0), 0);
    const avgPricePerLiter = totalLiters ? Math.round(totalCost / totalLiters) : 0;
    const lastFill = filteredRecords[0];
    return { totalCost, totalLiters, avgPricePerLiter, lastFill };
  }, [filteredRecords]);

  const unitPricePreview = useMemo(() => {
    const liters = Number(formValues.liters);
    const total = Number(formValues.price_total);
    if (!Number.isFinite(liters) || liters <= 0 || !Number.isFinite(total) || total <= 0) return null;
    return Math.round(total / liters);
  }, [formValues.liters, formValues.price_total]);

  const previousFullRecord = useMemo(() => records.find((item) => item.is_full), [records]);

  const handleSubmit = async () => {
    if (!vehicle) return;
    if (!formValues.date || !formValues.liters || !formValues.price_total || !formValues.odo_km) {
      showToast({ tone: "warning", message: "모든 필수 항목을 입력해주세요." });
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
      showToast({ tone: "success", message: "주유 기록을 저장했습니다." });
    } catch (error) {
      console.error("주유 기록 저장 오류", error);
      showToast({ tone: "error", message: "주유 기록을 저장하지 못했습니다." });
    }
  };

  const handleDelete = async (record) => {
    if (!record) return;
    try {
      await api.delete(`/fuel/${record.id}`);
      setPendingDelete(null);
      setSelectedRecord(null);
      await Promise.all([fetchRecords(), fetchStats()]);
      onCostDataChanged?.();
      showToast({ tone: "success", message: "주유 기록을 삭제했습니다." });
    } catch (error) {
      console.error("주유 기록 삭제 오류", error);
      showToast({ tone: "error", message: "주유 기록 삭제에 실패했습니다." });
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
    <div className="space-y-6 pb-28">
      <section className="space-y-4 rounded-2xl border border-border-light bg-surface-light p-5 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-light">주유 관리</h1>
            <p className="text-sm text-subtext-light">주유 기록을 쌓고 연비 흐름을 빠르게 확인하세요.</p>
          </div>
          <button type="button" className="flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90" onClick={openCreate}>
            <span className="material-symbols-outlined text-base">add</span>
            주유 기록 추가
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard title="평균 연비" value={stats?.avg_km_per_l != null ? `${Number(stats.avg_km_per_l).toFixed(1)}km/L` : "집계 없음"} caption="만땅 주유 기준" />
          <SummaryCard title="누적 주유 비용" value={`${Number(stats?.total_cost || 0).toLocaleString()}원`} />
          <SummaryCard title="선택 기간 주유량" value={`${summary.totalLiters.toFixed(1)}L`} caption={`총 ${filteredRecords.length}건`} />
          <SummaryCard title="평균 리터당 단가" value={summary.avgPricePerLiter ? `${summary.avgPricePerLiter.toLocaleString()}원` : "0원"} caption={summary.lastFill ? `${summary.lastFill.date} · ${summary.lastFill.liters}L` : "최근 기록 없음"} />
        </div>
      </section>

      <section className="rounded-2xl border border-border-light bg-surface-light p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          {RANGE_FILTERS.map((filter) => (
            <button key={filter.key} className={`rounded-full px-3 py-1 text-sm font-semibold transition ${rangeFilter === filter.key ? "bg-primary text-white" : "border border-border-light text-subtext-light"}`} onClick={() => setRangeFilter(filter.key)}>
              {filter.label}
            </button>
          ))}
          <label className="ml-auto inline-flex items-center gap-2 text-xs text-subtext-light">
            <input type="checkbox" checked={onlyFull} onChange={(e) => setOnlyFull(e.target.checked)} className="h-4 w-4 rounded border-border-light text-primary focus:ring-primary" />
            만땅 주유만 보기
          </label>
        </div>
      </section>

      <section className="space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-border-light bg-surface-light px-4 py-6 text-center text-sm text-subtext-light shadow-sm">데이터를 불러오는 중입니다...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-light bg-surface-light px-4 py-6 text-center text-sm text-subtext-light shadow-sm">조건에 맞는 주유 기록이 없습니다. 새 기록을 추가해보세요.</div>
        ) : (
          filteredRecords.map((record) => (
            <FuelRecordCard key={record.id} record={record} onView={() => setSelectedRecord(record)} onEdit={() => openEdit(record)} onDelete={() => setPendingDelete(record)} />
          ))
        )}
      </section>

      {formModal.open ? (
        <Modal
          title={formModal.mode === "edit" ? "주유 기록 수정" : "주유 기록 추가"}
          onClose={() => setFormModal({ open: false, mode: "create" })}
          actions={
            <div className="space-y-3">
              <button className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90" onClick={handleSubmit}>저장</button>
              <button className="w-full rounded-xl border border-border-light px-4 py-2 text-sm font-semibold text-subtext-light hover:text-primary" onClick={() => setFormModal({ open: false, mode: "create" })}>취소</button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-full border border-border-light px-3 py-1.5 text-xs font-semibold text-subtext-light transition hover:text-primary" onClick={() => setFormValues((prev) => ({ ...prev, odo_km: vehicle?.odo_km ? String(vehicle.odo_km) : prev.odo_km }))}>
                현재 주행거리 사용
              </button>
              {previousFullRecord ? (
                <button
                  type="button"
                  className="rounded-full border border-border-light px-3 py-1.5 text-xs font-semibold text-subtext-light transition hover:text-primary"
                  onClick={() =>
                    setFormValues((prev) => ({
                      ...prev,
                      liters: previousFullRecord.liters != null ? String(previousFullRecord.liters) : prev.liters,
                      price_total: previousFullRecord.price_total != null ? String(previousFullRecord.price_total) : prev.price_total,
                    }))
                  }
                >
                  최근 만땅 값 복사
                </button>
              ) : null}
            </div>
            <input type="date" className={INPUT_CLASS} value={formValues.date} onChange={(e) => setFormValues((prev) => ({ ...prev, date: e.target.value }))} required />
            <input type="number" className={INPUT_CLASS} placeholder="주유량 (L)" value={formValues.liters} onChange={(e) => setFormValues((prev) => ({ ...prev, liters: e.target.value }))} required />
            <input type="number" className={INPUT_CLASS} placeholder="총 금액 (원)" value={formValues.price_total} onChange={(e) => setFormValues((prev) => ({ ...prev, price_total: e.target.value }))} required />
            <input type="number" className={INPUT_CLASS} placeholder="주행거리 (km)" value={formValues.odo_km} onChange={(e) => setFormValues((prev) => ({ ...prev, odo_km: e.target.value }))} required />
            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
              {unitPricePreview ? `예상 리터당 단가 ${unitPricePreview.toLocaleString()}원` : "주유량과 총 금액을 입력하면 리터당 단가를 보여줍니다."}
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-subtext-light">
              <input type="checkbox" checked={formValues.is_full} onChange={(e) => setFormValues((prev) => ({ ...prev, is_full: e.target.checked }))} className="h-4 w-4 rounded border-border-light text-primary focus:ring-primary" />
              만땅 주유
            </label>
          </div>
        </Modal>
      ) : null}

      {selectedRecord ? (
        <FuelDetailSheet
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onEdit={() => {
            openEdit(selectedRecord);
            setSelectedRecord(null);
          }}
          onDelete={() => setPendingDelete(selectedRecord)}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="주유 기록 삭제"
        description={pendingDelete ? `${pendingDelete.date} 기록을 삭제합니다. 삭제 후 복구할 수 없습니다.` : ""}
        confirmLabel="삭제"
        onConfirm={() => handleDelete(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
