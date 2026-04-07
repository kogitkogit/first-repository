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

const ENERGY_MODE = {
  gasoline: "fuel",
  diesel: "fuel",
  hybrid: "fuel",
  phev: "both",
  ev: "charge",
};

const INPUT_CLASS =
  "block w-full rounded-xl border border-border-light bg-background-light px-3 py-2 text-sm text-text-light placeholder:text-subtext-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

const today = () => new Date().toISOString().slice(0, 10);
const money = (value) => `${Number(value || 0).toLocaleString()}원`;

function rangeOf(key) {
  const item = RANGE_FILTERS.find((entry) => entry.key === key);
  if (!item?.months) return null;
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - item.months);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

function defaultFuelForm(vehicle) {
  return {
    date: today(),
    liters: "",
    price_total: "",
    odo_km: vehicle?.odo_km ? String(vehicle.odo_km) : "",
    is_full: false,
  };
}

function defaultChargeForm(vehicle) {
  return {
    date: today(),
    energy_kwh: "",
    price_total: "",
    odo_km: vehicle?.odo_km ? String(vehicle.odo_km) : "",
    charge_type: "slow",
    battery_before_percent: "",
    battery_after_percent: "",
  };
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

function Modal({ title, onClose, children, onSave }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-surface-light p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-light">{title}</h2>
          <button type="button" className="text-subtext-light" onClick={onClose} aria-label="닫기">
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
        <div className="mt-4 space-y-3">{children}</div>
        <div className="mt-6 grid gap-3">
          <button
            type="button"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            onClick={onSave}
          >
            저장
          </button>
          <button
            type="button"
            className="rounded-xl border border-border-light px-4 py-2 text-sm font-semibold text-subtext-light hover:text-primary"
            onClick={onClose}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

function RecordCard({ title, record, chips, onView, onEdit, onDelete }) {
  return (
    <div className="rounded-2xl border border-border-light bg-surface-light p-4 shadow-sm transition hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-subtext-light">{record.date}</p>
          <p className="mt-1 text-base font-semibold text-text-light">{title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-subtext-light">{chips}</div>
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" className="rounded-full border border-border-light px-3 py-1 text-xs font-semibold text-subtext-light hover:text-primary" onClick={onView}>
            상세
          </button>
          <button type="button" className="rounded-full border border-border-light px-3 py-1 text-xs font-semibold text-subtext-light hover:text-primary" onClick={onEdit}>
            수정
          </button>
          <button type="button" className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50" onClick={onDelete}>
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailSheet({ title, onClose, onEdit, onDelete, rows }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="h-[70vh] w-full max-w-lg rounded-t-3xl bg-surface-light p-6 shadow-xl sm:h-auto sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="h-1.5 w-12 rounded-full bg-border-light sm:hidden" />
          <button type="button" className="text-subtext-light" onClick={onClose} aria-label="닫기">
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto">
          <h3 className="text-lg font-semibold text-text-light">{title}</h3>
          <div className="grid grid-cols-2 gap-3">
            {rows.map((row) => (
              <div key={row.label} className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-subtext-light">{row.label}</p>
                <p className="text-sm font-semibold text-text-light">{row.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="rounded-xl border border-border-light px-4 py-2 text-sm font-semibold text-subtext-light hover:text-primary" onClick={onEdit}>
              수정
            </button>
            <button type="button" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100" onClick={onDelete}>
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FuelPanel({ vehicle, onCostDataChanged = () => {} }) {
  const { showToast } = useToast();
  const [tab, setTab] = useState("fuel");
  const [rangeKey, setRangeKey] = useState("3m");
  const [onlyFull, setOnlyFull] = useState(false);
  const [fuelRecords, setFuelRecords] = useState([]);
  const [chargeRecords, setChargeRecords] = useState([]);
  const [fuelStats, setFuelStats] = useState(null);
  const [chargeStats, setChargeStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fuelForm, setFuelForm] = useState(() => defaultFuelForm(vehicle));
  const [chargeForm, setChargeForm] = useState(() => defaultChargeForm(vehicle));
  const [formState, setFormState] = useState({ open: false, type: "fuel", mode: "create", id: null });
  const [selected, setSelected] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const mode = ENERGY_MODE[vehicle?.fuelType] || "fuel";
  const showFuel = mode === "fuel" || mode === "both";
  const showCharge = mode === "charge" || mode === "both";
  const range = useMemo(() => rangeOf(rangeKey), [rangeKey]);
  const latestFuel = useMemo(() => fuelRecords.find((item) => item.is_full) || fuelRecords[0] || null, [fuelRecords]);
  const latestCharge = useMemo(() => chargeRecords[0] || null, [chargeRecords]);

  useEffect(() => {
    if (!vehicle) return;
    setFuelForm(defaultFuelForm(vehicle));
    setChargeForm(defaultChargeForm(vehicle));
  }, [vehicle]);

  useEffect(() => {
    setTab(mode === "charge" ? "charge" : "fuel");
  }, [mode, vehicle?.id]);

  useEffect(() => {
    if (!vehicle) return;
    setLoading(true);
    Promise.all([
      showFuel ? api.get("/fuel/list", { params: { vehicleId: vehicle.id } }) : Promise.resolve({ data: [] }),
      showFuel ? api.get("/fuel/stats", { params: { vehicleId: vehicle.id } }) : Promise.resolve({ data: null }),
      showCharge ? api.get("/charging/list", { params: { vehicleId: vehicle.id } }) : Promise.resolve({ data: [] }),
      showCharge ? api.get("/charging/stats", { params: { vehicleId: vehicle.id } }) : Promise.resolve({ data: null }),
    ])
      .then(([fuelList, fuelStat, chargeList, chargeStat]) => {
        setFuelRecords((fuelList.data || []).sort((a, b) => new Date(b.date) - new Date(a.date)));
        setFuelStats(fuelStat.data);
        setChargeRecords((chargeList.data || []).sort((a, b) => new Date(b.date) - new Date(a.date)));
        setChargeStats(chargeStat.data);
      })
      .catch((error) => {
        console.error("에너지 기록을 불러오지 못했습니다.", error);
        showToast({ tone: "error", message: "에너지 기록을 불러오지 못했습니다." });
      })
      .finally(() => setLoading(false));
  }, [showCharge, showFuel, showToast, vehicle]);

  const visibleRecords = useMemo(() => {
    const base = tab === "charge" ? chargeRecords : fuelRecords;
    let next = [...base];
    if (range) {
      next = next.filter((item) => {
        const date = String(item.date).slice(0, 10);
        return date >= range.from && date <= range.to;
      });
    }
    if (tab === "fuel" && onlyFull) next = next.filter((item) => item.is_full);
    return next;
  }, [chargeRecords, fuelRecords, onlyFull, range, tab]);

  const visibleSummary = useMemo(() => {
    if (tab === "charge") {
      const totalCost = visibleRecords.reduce((sum, item) => sum + Number(item.price_total || 0), 0);
      const totalAmount = visibleRecords.reduce((sum, item) => sum + Number(item.energy_kwh || 0), 0);
      return { totalCost, totalAmount, avgUnit: totalAmount ? Math.round(totalCost / totalAmount) : 0, latest: visibleRecords[0] || null };
    }
    const totalCost = visibleRecords.reduce((sum, item) => sum + Number(item.price_total || 0), 0);
    const totalAmount = visibleRecords.reduce((sum, item) => sum + Number(item.liters || 0), 0);
    return { totalCost, totalAmount, avgUnit: totalAmount ? Math.round(totalCost / totalAmount) : 0, latest: visibleRecords[0] || null };
  }, [tab, visibleRecords]);

  const fuelPreview = useMemo(() => {
    const liters = Number(fuelForm.liters);
    const price = Number(fuelForm.price_total);
    return liters > 0 && price > 0 ? Math.round(price / liters) : null;
  }, [fuelForm]);

  const chargePreview = useMemo(() => {
    const energy = Number(chargeForm.energy_kwh);
    const price = Number(chargeForm.price_total);
    return energy > 0 && price > 0 ? Math.round(price / energy) : null;
  }, [chargeForm]);

  async function refresh(type) {
    if (!vehicle) return;
    const requests = [];
    if (type === "fuel" || type === "all") {
      requests.push(api.get("/fuel/list", { params: { vehicleId: vehicle.id } }), api.get("/fuel/stats", { params: { vehicleId: vehicle.id } }));
    }
    if (type === "charge" || type === "all") {
      requests.push(api.get("/charging/list", { params: { vehicleId: vehicle.id } }), api.get("/charging/stats", { params: { vehicleId: vehicle.id } }));
    }
    const result = await Promise.all(requests);
    let i = 0;
    if (type === "fuel" || type === "all") {
      setFuelRecords((result[i++].data || []).sort((a, b) => new Date(b.date) - new Date(a.date)));
      setFuelStats(result[i++].data);
    }
    if (type === "charge" || type === "all") {
      setChargeRecords((result[i++].data || []).sort((a, b) => new Date(b.date) - new Date(a.date)));
      setChargeStats(result[i++].data);
    }
  }

  async function saveFuel() {
    if (!fuelForm.date || !fuelForm.liters || !fuelForm.price_total || !fuelForm.odo_km) {
      showToast({ tone: "warning", message: "모든 필수 항목을 입력해주세요." });
      return;
    }
    const payload = {
      vehicle_id: vehicle.id,
      date: fuelForm.date,
      liters: Number(fuelForm.liters),
      price_total: Number(fuelForm.price_total),
      odo_km: Number(fuelForm.odo_km),
      is_full: !!fuelForm.is_full,
    };
    await (formState.mode === "edit" ? api.put(`/fuel/${formState.id}`, payload) : api.post("/fuel/add", payload));
    setFormState({ open: false, type: "fuel", mode: "create", id: null });
    setFuelForm(defaultFuelForm(vehicle));
    await refresh("fuel");
    onCostDataChanged?.();
    showToast({ tone: "success", message: "저장되었습니다.", placement: "center", duration: 1800 });
  }

  async function saveCharge() {
    if (!chargeForm.date || !chargeForm.energy_kwh || !chargeForm.price_total || !chargeForm.odo_km) {
      showToast({ tone: "warning", message: "모든 필수 항목을 입력해주세요." });
      return;
    }
    const payload = {
      vehicle_id: vehicle.id,
      date: chargeForm.date,
      energy_kwh: Number(chargeForm.energy_kwh),
      price_total: Number(chargeForm.price_total),
      odo_km: Number(chargeForm.odo_km),
      charge_type: chargeForm.charge_type || null,
      battery_before_percent: chargeForm.battery_before_percent === "" ? null : Number(chargeForm.battery_before_percent),
      battery_after_percent: chargeForm.battery_after_percent === "" ? null : Number(chargeForm.battery_after_percent),
    };
    await (formState.mode === "edit" ? api.put(`/charging/${formState.id}`, payload) : api.post("/charging/add", payload));
    setFormState({ open: false, type: "charge", mode: "create", id: null });
    setChargeForm(defaultChargeForm(vehicle));
    await refresh("charge");
    onCostDataChanged?.();
    showToast({ tone: "success", message: "저장되었습니다.", placement: "center", duration: 1800 });
  }

  async function deleteSelected() {
    if (!pendingDelete) return;
    await api.delete(`/${pendingDelete.type}/${pendingDelete.id}`);
    setPendingDelete(null);
    setSelected(null);
    await refresh(pendingDelete.type === "charging" ? "charge" : pendingDelete.type);
    onCostDataChanged?.();
    showToast({ tone: "success", message: pendingDelete.type === "fuel" ? "주유 기록을 삭제했습니다." : "충전 기록을 삭제했습니다." });
  }

  function openEdit(record) {
    if (tab === "charge") {
      setChargeForm({
        date: record.date,
        energy_kwh: record.energy_kwh != null ? String(record.energy_kwh) : "",
        price_total: record.price_total != null ? String(record.price_total) : "",
        odo_km: record.odo_km != null ? String(record.odo_km) : "",
        charge_type: record.charge_type || "slow",
        battery_before_percent: record.battery_before_percent != null ? String(record.battery_before_percent) : "",
        battery_after_percent: record.battery_after_percent != null ? String(record.battery_after_percent) : "",
      });
    } else {
      setFuelForm({
        date: record.date,
        liters: record.liters != null ? String(record.liters) : "",
        price_total: record.price_total != null ? String(record.price_total) : "",
        odo_km: record.odo_km != null ? String(record.odo_km) : "",
        is_full: !!record.is_full,
      });
    }
    setFormState({ open: true, type: tab, mode: "edit", id: record.id });
  }

  if (!vehicle) return <div className="p-6 text-center text-sm text-subtext-light">차량을 다시 선택해주세요.</div>;

  return (
    <div className="space-y-6 pb-28">
      <section className="space-y-4 rounded-2xl border border-border-light bg-surface-light p-5 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-light">{mode === "charge" ? "충전 관리" : mode === "both" ? "주유/충전 관리" : "주유 관리"}</h1>
            <p className="text-sm text-subtext-light">{mode === "charge" ? "전기차 충전 기록과 에너지 비용을 관리합니다." : mode === "both" ? "주유와 충전을 차량 타입에 맞게 함께 관리합니다." : "주유 기록과 연비 흐름을 빠르게 확인하세요."}</p>
          </div>
          <button type="button" className="flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90" onClick={() => setFormState({ open: true, type: tab, mode: "create", id: null })}>
            <span className="material-symbols-outlined text-base">add</span>
            {tab === "charge" ? "충전 기록 추가" : "주유 기록 추가"}
          </button>
        </div>
        {mode === "both" ? (
          <div className="inline-flex rounded-full border border-border-light p-1 text-sm font-semibold">
            <button type="button" className={`rounded-full px-4 py-1.5 ${tab === "fuel" ? "bg-primary text-white" : "text-subtext-light"}`} onClick={() => setTab("fuel")}>주유</button>
            <button type="button" className={`rounded-full px-4 py-1.5 ${tab === "charge" ? "bg-primary text-white" : "text-subtext-light"}`} onClick={() => setTab("charge")}>충전</button>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard title={tab === "charge" ? "평균 전비" : "평균 연비"} value={tab === "charge" ? (chargeStats?.avg_km_per_kwh != null ? `${Number(chargeStats.avg_km_per_kwh).toFixed(1)}km/kWh` : "집계 없음") : (fuelStats?.avg_km_per_l != null ? `${Number(fuelStats.avg_km_per_l).toFixed(1)}km/L` : "집계 없음")} caption={tab === "charge" ? "충전 기록 기준" : "가득 주유 기준"} />
          <SummaryCard title={tab === "charge" ? "누적 충전 비용" : "누적 주유 비용"} value={money(tab === "charge" ? chargeStats?.total_cost : fuelStats?.total_cost)} />
          <SummaryCard title={tab === "charge" ? "선택 기간 충전량" : "선택 기간 주유량"} value={`${Number(visibleSummary.totalAmount || 0).toFixed(1)}${tab === "charge" ? "kWh" : "L"}`} caption={`총 ${visibleRecords.length}건`} />
          <SummaryCard title={tab === "charge" ? "평균 kWh당 비용" : "평균 리터당 비용"} value={visibleSummary.avgUnit ? money(visibleSummary.avgUnit) : "0원"} caption={visibleSummary.latest ? `${visibleSummary.latest.date} · ${tab === "charge" ? visibleSummary.latest.energy_kwh : visibleSummary.latest.liters}${tab === "charge" ? "kWh" : "L"}` : "최근 기록 없음"} />
        </div>
      </section>

      <section className="rounded-2xl border border-border-light bg-surface-light p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          {RANGE_FILTERS.map((item) => (
            <button key={item.key} type="button" className={`rounded-full px-3 py-1 text-sm font-semibold ${rangeKey === item.key ? "bg-primary text-white" : "border border-border-light text-subtext-light"}`} onClick={() => setRangeKey(item.key)}>{item.label}</button>
          ))}
          {tab === "fuel" ? (
            <label className="ml-auto inline-flex items-center gap-2 text-xs text-subtext-light">
              <input type="checkbox" checked={onlyFull} onChange={(e) => setOnlyFull(e.target.checked)} className="h-4 w-4 rounded border-border-light text-primary focus:ring-primary" />
              가득 주유만 보기
            </label>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        {loading ? <div className="rounded-2xl border border-border-light bg-surface-light px-4 py-6 text-center text-sm text-subtext-light shadow-sm">데이터를 불러오는 중입니다...</div> : null}
        {!loading && visibleRecords.length === 0 ? <div className="rounded-2xl border border-dashed border-border-light bg-surface-light px-4 py-6 text-center text-sm text-subtext-light shadow-sm">{tab === "charge" ? "조건에 맞는 충전 기록이 없습니다. 첫 기록을 추가해보세요." : "조건에 맞는 주유 기록이 없습니다. 첫 기록을 추가해보세요."}</div> : null}
        {!loading && visibleRecords.map((record) => tab === "charge" ? (
          <RecordCard key={`charge-${record.id}`} title={`${Number(record.energy_kwh || 0).toFixed(1)}kWh · ${money(record.price_total)}`} record={record} chips={<><span className="rounded-full bg-background-light px-2.5 py-0.5 font-semibold">{Number(record.odo_km || 0).toLocaleString()}km</span><span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-semibold text-primary">{record.charge_type === "fast" ? "급속" : "완속"}</span><span>{Number(record.energy_kwh || 0) > 0 ? `kWh당 ${money(Math.round(Number(record.price_total || 0) / Number(record.energy_kwh || 1)))}` : ""}</span></>} onView={() => setSelected({ type: "charge", record })} onEdit={() => openEdit(record)} onDelete={() => setPendingDelete({ type: "charging", id: record.id })} />
        ) : (
          <RecordCard key={`fuel-${record.id}`} title={`${Number(record.liters || 0).toFixed(1)}L · ${money(record.price_total)}`} record={record} chips={<><span className="rounded-full bg-background-light px-2.5 py-0.5 font-semibold">{Number(record.odo_km || 0).toLocaleString()}km</span><span className={`rounded-full px-2.5 py-0.5 font-semibold ${record.is_full ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-700"}`}>{record.is_full ? "가득 주유" : "부분 주유"}</span><span>{Number(record.liters || 0) > 0 ? `리터당 ${money(Math.round(Number(record.price_total || 0) / Number(record.liters || 1)))}` : ""}</span></>} onView={() => setSelected({ type: "fuel", record })} onEdit={() => openEdit(record)} onDelete={() => setPendingDelete({ type: "fuel", id: record.id })} />
        ))}
      </section>

      {formState.open && formState.type === "fuel" ? (
        <Modal title={formState.mode === "edit" ? "주유 기록 수정" : "주유 기록 추가"} onClose={() => setFormState({ open: false, type: "fuel", mode: "create", id: null })} onSave={() => saveFuel().catch((error) => { console.error(error); showToast({ tone: "error", message: "주유 기록을 저장하지 못했습니다." }); })}>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded-full border border-border-light px-3 py-1.5 text-xs font-semibold text-subtext-light hover:text-primary" onClick={() => setFuelForm((prev) => ({ ...prev, odo_km: vehicle?.odo_km ? String(vehicle.odo_km) : prev.odo_km }))}>현재 주행거리 사용</button>
            {latestFuel ? <button type="button" className="rounded-full border border-border-light px-3 py-1.5 text-xs font-semibold text-subtext-light hover:text-primary" onClick={() => setFuelForm((prev) => ({ ...prev, liters: latestFuel.liters != null ? String(latestFuel.liters) : prev.liters, price_total: latestFuel.price_total != null ? String(latestFuel.price_total) : prev.price_total }))}>최근값 복사</button> : null}
          </div>
          <input type="date" className={INPUT_CLASS} value={fuelForm.date} onChange={(e) => setFuelForm((prev) => ({ ...prev, date: e.target.value }))} />
          <input type="number" className={INPUT_CLASS} placeholder="주유량 (L)" value={fuelForm.liters} onChange={(e) => setFuelForm((prev) => ({ ...prev, liters: e.target.value }))} />
          <input type="number" className={INPUT_CLASS} placeholder="총 금액 (원)" value={fuelForm.price_total} onChange={(e) => setFuelForm((prev) => ({ ...prev, price_total: e.target.value }))} />
          <input type="number" className={INPUT_CLASS} placeholder="주행거리 (km)" value={fuelForm.odo_km} onChange={(e) => setFuelForm((prev) => ({ ...prev, odo_km: e.target.value }))} />
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">{fuelPreview ? `예상 리터당 비용 ${money(fuelPreview)}` : "주유량과 총 금액을 입력하면 리터당 비용을 보여줍니다."}</div>
          <label className="inline-flex items-center gap-2 text-sm text-subtext-light"><input type="checkbox" checked={fuelForm.is_full} onChange={(e) => setFuelForm((prev) => ({ ...prev, is_full: e.target.checked }))} className="h-4 w-4 rounded border-border-light text-primary focus:ring-primary" />가득 주유</label>
        </Modal>
      ) : null}

      {formState.open && formState.type === "charge" ? (
        <Modal title={formState.mode === "edit" ? "충전 기록 수정" : "충전 기록 추가"} onClose={() => setFormState({ open: false, type: "charge", mode: "create", id: null })} onSave={() => saveCharge().catch((error) => { console.error(error); showToast({ tone: "error", message: "충전 기록을 저장하지 못했습니다." }); })}>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded-full border border-border-light px-3 py-1.5 text-xs font-semibold text-subtext-light hover:text-primary" onClick={() => setChargeForm((prev) => ({ ...prev, odo_km: vehicle?.odo_km ? String(vehicle.odo_km) : prev.odo_km }))}>현재 주행거리 사용</button>
            {latestCharge ? <button type="button" className="rounded-full border border-border-light px-3 py-1.5 text-xs font-semibold text-subtext-light hover:text-primary" onClick={() => setChargeForm((prev) => ({ ...prev, energy_kwh: latestCharge.energy_kwh != null ? String(latestCharge.energy_kwh) : prev.energy_kwh, price_total: latestCharge.price_total != null ? String(latestCharge.price_total) : prev.price_total, charge_type: latestCharge.charge_type || prev.charge_type, battery_before_percent: latestCharge.battery_before_percent != null ? String(latestCharge.battery_before_percent) : prev.battery_before_percent, battery_after_percent: latestCharge.battery_after_percent != null ? String(latestCharge.battery_after_percent) : prev.battery_after_percent }))}>최근값 복사</button> : null}
          </div>
          <input type="date" className={INPUT_CLASS} value={chargeForm.date} onChange={(e) => setChargeForm((prev) => ({ ...prev, date: e.target.value }))} />
          <input type="number" className={INPUT_CLASS} placeholder="충전량 (kWh)" value={chargeForm.energy_kwh} onChange={(e) => setChargeForm((prev) => ({ ...prev, energy_kwh: e.target.value }))} />
          <input type="number" className={INPUT_CLASS} placeholder="총 금액 (원)" value={chargeForm.price_total} onChange={(e) => setChargeForm((prev) => ({ ...prev, price_total: e.target.value }))} />
          <input type="number" className={INPUT_CLASS} placeholder="주행거리 (km)" value={chargeForm.odo_km} onChange={(e) => setChargeForm((prev) => ({ ...prev, odo_km: e.target.value }))} />
          <select className={INPUT_CLASS} value={chargeForm.charge_type} onChange={(e) => setChargeForm((prev) => ({ ...prev, charge_type: e.target.value }))}><option value="slow">완속 충전</option><option value="fast">급속 충전</option></select>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" className={INPUT_CLASS} placeholder="충전 전 배터리(%)" value={chargeForm.battery_before_percent} onChange={(e) => setChargeForm((prev) => ({ ...prev, battery_before_percent: e.target.value }))} />
            <input type="number" className={INPUT_CLASS} placeholder="충전 후 배터리(%)" value={chargeForm.battery_after_percent} onChange={(e) => setChargeForm((prev) => ({ ...prev, battery_after_percent: e.target.value }))} />
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">{chargePreview ? `예상 kWh당 비용 ${money(chargePreview)}` : "충전량과 총 금액을 입력하면 kWh당 비용을 보여줍니다."}</div>
        </Modal>
      ) : null}

      {selected?.type === "fuel" ? <DetailSheet title="주유 기록 상세" onClose={() => setSelected(null)} onEdit={() => { openEdit(selected.record); setSelected(null); }} onDelete={() => setPendingDelete({ type: "fuel", id: selected.record.id })} rows={[{ label: "주유 날짜", value: selected.record.date }, { label: "주유량", value: `${Number(selected.record.liters || 0).toFixed(1)}L` }, { label: "총 금액", value: money(selected.record.price_total) }, { label: "주행거리", value: `${Number(selected.record.odo_km || 0).toLocaleString()}km` }, { label: "주유 방식", value: selected.record.is_full ? "가득 주유" : "부분 주유" }]} /> : null}
      {selected?.type === "charge" ? <DetailSheet title="충전 기록 상세" onClose={() => setSelected(null)} onEdit={() => { openEdit(selected.record); setSelected(null); }} onDelete={() => setPendingDelete({ type: "charging", id: selected.record.id })} rows={[{ label: "충전 날짜", value: selected.record.date }, { label: "충전량", value: `${Number(selected.record.energy_kwh || 0).toFixed(1)}kWh` }, { label: "총 금액", value: money(selected.record.price_total) }, { label: "주행거리", value: `${Number(selected.record.odo_km || 0).toLocaleString()}km` }, { label: "충전 방식", value: selected.record.charge_type === "fast" ? "급속" : "완속" }, { label: "배터리", value: `${selected.record.battery_before_percent ?? "-"}% -> ${selected.record.battery_after_percent ?? "-"}%` }]} /> : null}

      <ConfirmDialog open={Boolean(pendingDelete)} title={pendingDelete?.type === "charging" ? "충전 기록 삭제" : "주유 기록 삭제"} description="삭제 후에는 복구할 수 없습니다." confirmLabel="삭제" cancelLabel="취소" onConfirm={() => deleteSelected().catch((error) => { console.error(error); showToast({ tone: "error", message: "기록을 삭제하지 못했습니다." }); })} onCancel={() => setPendingDelete(null)} />
    </div>
  );
}
