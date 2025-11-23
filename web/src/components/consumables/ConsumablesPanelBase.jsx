import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";

const formatNumber = (value, suffix = "") => {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return `${num.toLocaleString()}${suffix}`;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const computeDistanceStatus = ({ currentMileage, lastOdo, cycleKm }) => {
  if (cycleKm == null) return { tone: "muted", message: "주행 주기가 설정되지 않았습니다." };
  if (currentMileage == null) return { tone: "muted", message: "현재 주행거리를 불러올 수 없습니다." };
  if (lastOdo == null) return { tone: "muted", message: "마지막 교체 주행거리가 없습니다." };

  const used = Number(currentMileage) - Number(lastOdo);
  if (!Number.isFinite(used)) {
    return { tone: "muted", message: "주행거리 계산 중 오류가 발생했습니다." };
  }
  const remain = cycleKm - used;
  if (!Number.isFinite(remain)) {
    return { tone: "muted", message: "주행거리 계산 중 오류가 발생했습니다." };
  }
  if (remain <= 0) {
    return { tone: "danger", message: "즉시 교체가 필요합니다." };
  }
  if (remain <= Math.max(500, cycleKm * 0.2)) {
    return { tone: "warn", message: `${Math.max(0, Math.round(remain)).toLocaleString()} km 이내 교체 권장` };
  }
  return { tone: "ok", message: `${Math.max(0, Math.round(remain)).toLocaleString()} km 여유가 있습니다.` };
};

const monthsDiffFromNow = (dateLike) => {
  if (!dateLike) return null;
  const date = new Date(dateLike);
  if (!Number.isFinite(date.getTime())) return null;
  const now = new Date();
  return (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
};

const computeTimeStatus = ({ lastDate, cycleMonths }) => {
  if (!cycleMonths) return { tone: "muted", message: "교체 주기(개월)가 설정되지 않았습니다." };
  if (!lastDate) return { tone: "muted", message: "마지막 교체일이 없습니다." };
  const months = monthsDiffFromNow(lastDate);
  if (months == null) return { tone: "muted", message: "교체 주기 계산에 실패했습니다." };
  const remain = cycleMonths - months;
  if (!Number.isFinite(remain)) return { tone: "muted", message: "교체 주기를 계산할 수 없습니다." };
  if (remain <= 0) return { tone: "danger", message: "즉시 교체가 필요합니다." };
  if (remain <= Math.max(1, Math.round(cycleMonths * 0.2))) {
    return { tone: "warn", message: `${Math.max(0, remain)}개월 이내 교체 권장` };
  }
  return { tone: "ok", message: `${Math.max(0, remain)}개월 여유가 있습니다.` };
};

const toneBadgeClass = (tone) => {
  switch (tone) {
    case "danger":
      return "bg-red-100 text-red-700";
    case "warn":
      return "bg-amber-100 text-amber-700";
    case "ok":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

const toneLabel = (tone) => {
  switch (tone) {
    case "danger":
      return "즉시 교체 필요";
    case "warn":
      return "교체 임박";
    case "ok":
      return "정상";
    default:
      return "정보 부족";
  }
};

const statusForItem = ({ item, latestRecord, currentMileage }) => {
  const mode = item.mode || (item.cycleKm ? "distance" : "time");
  if (mode === "distance") {
    return computeDistanceStatus({
      currentMileage,
      lastOdo: latestRecord?.odo_km ?? item.last_odo_km ?? null,
      cycleKm: Number(item.cycleKm ?? item.cycle_km ?? 0) || null,
    });
  }
  return computeTimeStatus({
    lastDate: latestRecord?.date ?? item.last_date ?? null,
    cycleMonths: Number(item.cycleMonths ?? item.cycle_months ?? 0) || null,
  });
};

function HistorySheet({ open, onClose, records, kind, onDelete }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-t-3xl bg-white text-text-light shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border-light px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{kind} 기록 내역</h2>
            <p className="text-xs text-subtext-light">최근 입력 순으로 정렬됩니다.</p>
          </div>
          <button
            type="button"
            className="p-2 text-subtext-light transition hover:text-primary"
            onClick={onClose}
            aria-label="닫기"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          {!records.length ? (
            <p className="py-12 text-center text-sm text-subtext-light">등록된 기록이 없습니다.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {records.map((row) => (
                <li key={row.id} className="rounded-xl border border-border-light bg-surface-light p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-subtext-light">{row.date?.slice(0, 10) || "날짜 정보 없음"}</p>
                      <p className="mt-1 font-semibold text-text-light">{formatNumber(row.odo_km, " km")}</p>
                      {row.memo && <p className="mt-1 text-xs text-subtext-light">{row.memo}</p>}
                      {row.cost != null && (
                        <p className="mt-1 text-xs text-subtext-light">비용: {formatNumber(row.cost, " 원")}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
                      onClick={() => onDelete(row.id)}
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function AddRecordModal({ open, onClose, onSave, kind, currentMileage }) {
  const [form, setForm] = useState({
    date: todayISO(),
    odo_km: currentMileage != null ? String(currentMileage) : "",
    cost: "",
    memo: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        date: todayISO(),
        odo_km: currentMileage != null ? String(currentMileage) : "",
        cost: "",
        memo: "",
      });
    }
  }, [open, currentMileage]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!form.date) {
      alert("날짜를 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        date: form.date,
        odo_km: form.odo_km ? Number(form.odo_km) : null,
        cost: form.cost ? Number(form.cost) : null,
        memo: form.memo || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-light">{kind} 기록 추가</h2>
          <button
            type="button"
            className="p-2 text-subtext-light transition hover:text-primary"
            onClick={onClose}
            aria-label="닫기"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
        <div className="mt-4 space-y-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="font-medium text-text-light">교체 일자</span>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              className="h-11 rounded-xl border border-border-light px-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium text-text-light">주행거리 (km)</span>
            <input
              type="number"
              value={form.odo_km}
              onChange={(e) => setForm((prev) => ({ ...prev, odo_km: e.target.value }))}
              placeholder="예: 45000"
              className="h-11 rounded-xl border border-border-light px-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium text-text-light">비용 (원)</span>
            <input
              type="number"
              value={form.cost}
              onChange={(e) => setForm((prev) => ({ ...prev, cost: e.target.value }))}
              placeholder="예: 80000"
              className="h-11 rounded-xl border border-border-light px-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium text-text-light">메모 (선택)</span>
            <textarea
              rows={3}
              value={form.memo}
              onChange={(e) => setForm((prev) => ({ ...prev, memo: e.target.value }))}
              className="rounded-xl border border-border-light px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="메모를 입력해 주세요."
            />
          </label>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            className="flex-1 rounded-xl border border-border-light px-4 py-2 text-sm font-semibold text-subtext-light hover:text-primary"
            onClick={onClose}
          >
            취소
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:bg-primary/40"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConsumablesPanelBase({
  vehicleId,
  currentMileage,
  category,
  panelTitle,
  defaultItems,
  apiClient = api,
  hideLocalBack = false,
  onBack,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [itemsConfig, setItemsConfig] = useState([]);
  const [history, setHistory] = useState([]);
  const [historySheet, setHistorySheet] = useState({ open: false, kind: "" });
  const [addModal, setAddModal] = useState({ open: false, kind: "" });

  const defaultItemMap = useMemo(() => {
    const map = new Map();
    defaultItems.forEach((item) => map.set(item.kind, item));
    return map;
  }, [defaultItems]);

  useEffect(() => {
    if (!vehicleId) return;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [itemsRes, historyRes] = await Promise.all([
          apiClient
            .get("/consumables/items", { params: { vehicleId, category } })
            .catch(() => ({ data: [] })),
          apiClient
            .get("/consumables/search", {
              params: { vehicleId, category, sort: "date", order: "desc" },
            })
            .catch(() => ({ data: [] })),
        ]);
        setItemsConfig(itemsRes.data || []);
        setHistory(historyRes.data || []);
      } catch (err) {
        console.error("소모품 데이터를 불러오는 중 오류가 발생했습니다.", err);
        setError("소모품 데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [vehicleId, category, apiClient]);

  const historyByKind = useMemo(() => {
    const map = new Map();
    history.forEach((record) => {
      const list = map.get(record.kind) || [];
      list.push(record);
      map.set(record.kind, list);
    });
    return map;
  }, [history]);

  const items = useMemo(() => {
    if (itemsConfig.length === 0) {
      return defaultItems.map((item) => ({
        ...item,
        key: item.kind,
        mode: item.mode || (item.cycleKm ? "distance" : "time"),
      }));
    }
    return itemsConfig.map((item) => ({
      key: item.kind,
      kind: item.kind,
      mode: item.mode || (item.cycle_km ? "distance" : "time"),
      cycleKm: item.cycle_km,
      cycleMonths: item.cycle_months,
      icon: defaultItemMap.get(item.kind)?.icon,
    }));
  }, [itemsConfig, defaultItems, defaultItemMap]);

  const refresh = async () => {
    if (!vehicleId) return;
    try {
      const [itemsRes, historyRes] = await Promise.all([
        apiClient.get("/consumables/items", { params: { vehicleId, category } }),
        apiClient.get("/consumables/search", {
          params: { vehicleId, category, sort: "date", order: "desc" },
        }),
      ]);
      setItemsConfig(itemsRes.data || []);
      setHistory(historyRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const preparedItems = useMemo(() => {
    return items.map((item) => {
      const defaults = defaultItemMap.get(item.kind) || {};
      const latestRecord = historyByKind.get(item.kind)?.[0] || null;
      const cycleKm = item.cycleKm ?? item.cycle_km ?? defaults.cycleKm ?? null;
      const cycleMonths = item.cycleMonths ?? item.cycle_months ?? defaults.cycleMonths ?? null;
      const icon = item.icon || defaults.icon || "build";
      const status = statusForItem({
        item: { ...defaults, ...item, cycleKm, cycleMonths },
        latestRecord,
        currentMileage,
      });
      return {
        ...item,
        icon,
        cycleKm,
        cycleMonths,
        latestRecord,
        status,
      };
    });
  }, [items, defaultItemMap, historyByKind, currentMileage]);

  const dueCount = useMemo(
    () => preparedItems.filter(({ status }) => status.tone === "danger" || status.tone === "warn").length,
    [preparedItems],
  );

  const handleAddRecord = async (kind, payload) => {
    await apiClient.post("/consumables/add", {
      vehicle_id: vehicleId,
      category,
      kind,
      date: payload.date,
      odo_km: payload.odo_km,
      cost: payload.cost,
      memo: payload.memo,
    });
    await refresh();
  };

  const handleDeleteRecord = async (recordId) => {
    await apiClient.delete(`/consumables/${recordId}`);
    await refresh();
  };

  return (
    <div className="space-y-6 pb-24">
      {!hideLocalBack && (
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm text-subtext-light transition hover:text-primary"
          onClick={() => (onBack ? onBack() : window.history.back())}
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          뒤로가기
        </button>
      )}

      <header className="space-y-2">
        <h1 className="text-xl font-bold text-text-light">{panelTitle}</h1>
        <p className="text-sm text-subtext-light">
          설정된 주기와 최근 기록을 비교해 상태를 계산하고, 교체 임박 항목을 빠르게 확인할 수 있습니다.
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      ) : null}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border-light bg-surface-light p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-subtext-light">등록 항목</p>
          <p className="mt-2 text-xl font-bold text-text-light">{preparedItems.length}건</p>
        </div>
        <div className="rounded-2xl border border-border-light bg-surface-light p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-subtext-light">교체 임박</p>
          <p className={`mt-2 text-xl font-bold ${dueCount ? "text-red-600" : "text-text-light"}`}>{dueCount}건</p>
        </div>
        <div className="rounded-2xl border border-border-light bg-surface-light p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-subtext-light">총 기록 수</p>
          <p className="mt-2 text-xl font-bold text-text-light">{history.length}건</p>
        </div>
      </section>

      {loading ? (
        <div className="rounded-2xl border border-border-light bg-surface-light px-4 py-6 text-center text-sm text-subtext-light">
          데이터를 불러오는 중입니다...
        </div>
      ) : (
        <div className="space-y-4">
          {preparedItems.map((item) => {
            const latest = item.latestRecord;
            const defaults = defaultItemMap.get(item.kind) || {};
            const modeLabel = (item.mode || defaults.mode || "distance") === "distance" ? "주행 기준" : "기간 기준";
            return (
              <div key={item.key} className="rounded-2xl border border-border-light bg-surface-light p-4 shadow-card">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">{item.icon || defaults.icon || "build"}</span>
                      <h2 className="text-lg font-semibold text-text-light">{item.kind}</h2>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      {modeLabel}
                    </span>
                    <p className="text-sm text-subtext-light">
                      {item.mode === "distance" || ((!item.mode || item.mode === "distance") && (item.cycleKm || defaults.cycleKm))
                        ? `교체 주기: ${formatNumber(item.cycleKm ?? defaults.cycleKm, " km")} / ${formatNumber(item.cycleMonths ?? defaults.cycleMonths, " 개월")}`
                        : `교체 주기: ${formatNumber(item.cycleMonths ?? defaults.cycleMonths, " 개월")}`}
                    </p>
                    <div className="text-sm">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${toneBadgeClass(item.status.tone)}`}>
                        {toneLabel(item.status.tone)}
                      </span>
                      <p className="mt-2 text-text-light">{item.status.message}</p>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-subtext-light sm:grid-cols-4">
                      <div>
                        <p className="font-semibold text-text-light">최종 교체일</p>
                        <p>{latest?.date?.slice(0, 10) || item.last_date?.slice(0, 10) || "-"}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-text-light">최종 주행거리</p>
                        <p>{formatNumber(latest?.odo_km ?? item.last_odo_km, " km")}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-text-light">최근 비용</p>
                        <p>{formatNumber(latest?.cost, " 원")}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-text-light">기록 건수</p>
                        <p>{historyByKind.get(item.kind)?.length || 0}건</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
                      onClick={() => setAddModal({ open: true, kind: item.kind })}
                    >
                      기록 추가
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-border-light px-4 py-2 text-sm font-semibold text-subtext-light transition hover:text-primary"
                      onClick={() => setHistorySheet({ open: true, kind: item.kind })}
                      disabled={!(historyByKind.get(item.kind)?.length)}
                    >
                      내역 보기
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddRecordModal
        open={addModal.open}
        kind={addModal.kind}
        currentMileage={currentMileage}
        onClose={() => setAddModal({ open: false, kind: "" })}
        onSave={(payload) => handleAddRecord(addModal.kind, payload)}
      />
      <HistorySheet
        open={historySheet.open}
        kind={historySheet.kind}
        records={historyByKind.get(historySheet.kind) || []}
        onClose={() => setHistorySheet({ open: false, kind: "" })}
        onDelete={(id) => handleDeleteRecord(id)}
      />
    </div>
  );
}
