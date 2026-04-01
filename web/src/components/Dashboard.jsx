import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useDrivingAnalysis } from "./DrivingAnalysisPanel";
import { CONSUMABLE_CATEGORY_META } from "../constants/consumables";
import { fetchCostSnapshot } from "../utils/costs";
import { useToast } from "./ui/ToastProvider";

const menu = [
  { key: "basic", label: "기본 정보", icon: "badge", path: "/basic" },
  { key: "oil", label: "오일 관리", icon: "oil_barrel", path: "/oil" },
  { key: "filter", label: "필터 관리", icon: "air", path: "/filter" },
  { key: "other", label: "소모품 관리", icon: "inventory_2", path: "/other" },
  { key: "tire", label: "타이어 관리", icon: "tire_repair", path: "/tire" },
  { key: "maintenance", label: "정비 이력", icon: "build_circle", path: "/maintenance" },
  { key: "legal", label: "법적 서류", icon: "gavel", path: "/legal" },
  { key: "fuel", label: "주유 관리", icon: "local_gas_station", path: "/fuel" },
  { key: "settings", label: "환경 설정", icon: "settings", path: "/settings" },
];

const DUE_TONE_PRIORITY = { danger: 0, warn: 1, ok: 2, muted: 3 };
const FUEL_TYPE_LABEL = {
  gasoline: "휘발유",
  diesel: "경유",
  hybrid: "하이브리드",
  phev: "플러그인 하이브리드",
  ev: "전기",
};

export default function Dashboard({ vehicle, onVehicleRefresh, costRefreshKey = 0, legalSummary = {} }) {
  const { showToast } = useToast();
  const [stats, setStats] = useState({ avg_km_per_l: null, total_cost: null });
  const [chargeStats, setChargeStats] = useState({ avg_km_per_kwh: null, total_cost: null, total_kwh: null });
  const [expenseMonthly, setExpenseMonthly] = useState(0);
  const [currentOdo, setCurrentOdo] = useState(null);
  const [odoReady, setOdoReady] = useState(false);
  const [odoEditing, setOdoEditing] = useState(false);
  const [odoDate, setOdoDate] = useState("");
  const [odoKm, setOdoKm] = useState("");
  const [dueSummary, setDueSummary] = useState({ loading: true, items: [], error: null });
  const [dueModalOpen, setDueModalOpen] = useState(false);

  const analysis = useDrivingAnalysis(vehicle);
  const {
    distanceLabel,
    formattedDistance,
    fetchDistance,
  } = analysis;

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!vehicle) return;
    setOdoReady(false);

    api
      .get("/fuel/stats", { params: { vehicleId: vehicle.id } })
      .then((r) => setStats(r.data))
      .catch(() => {
        setStats({ avg_km_per_l: null, total_cost: null });
      });

    api
      .get("/charging/stats", { params: { vehicleId: vehicle.id } })
      .then((r) => setChargeStats(r.data))
      .catch(() => {
        setChargeStats({ avg_km_per_kwh: null, total_cost: null, total_kwh: null });
      });

    api
      .get("/odometer/current", { params: { vehicleId: vehicle.id } })
      .then((r) => setCurrentOdo(r.data?.odo_km))
      .catch(() => {
        setCurrentOdo(null);
      })
      .finally(() => {
        setOdoReady(true);
      });
  }, [vehicle?.id, costRefreshKey]);

  useEffect(() => {
    if (!vehicle?.id) {
      setExpenseMonthly(0);
      return;
    }
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);
    let cancelled = false;

    const loadMonthlyCost = async () => {
      try {
        const snapshot = await fetchCostSnapshot({
          vehicleId: vehicle.id,
          startDate: monthStart,
          endDate: monthEnd,
        });
        if (!cancelled) {
          setExpenseMonthly(snapshot.overallTotal);
        }
      } catch (error) {
        console.error("이번 달 비용 집계 실패", error);
        if (!cancelled) {
          setExpenseMonthly(0);
        }
      }
    };

    loadMonthlyCost();
    return () => {
      cancelled = true;
    };
  }, [vehicle?.id]);

  const loadDueSummary = useCallback(async () => {
    if (!vehicle) {
      setDueSummary({ loading: false, items: [], error: null });
      return;
    }
    setDueSummary((prev) => ({ ...prev, loading: true, error: null }));
    const baseMileage = Number.isFinite(Number(currentOdo))
      ? Number(currentOdo)
      : Number.isFinite(Number(vehicle?.odo_km))
      ? Number(vehicle?.odo_km)
      : null;
    try {
      const [consumableDue, tireDue] = await Promise.all([
        summarizeConsumableDue(vehicle.id, baseMileage),
        summarizeTireDue(vehicle.id),
      ]);
      const items = [...consumableDue, ...tireDue].sort((a, b) => {
        const diff = DUE_TONE_PRIORITY[a.tone] - DUE_TONE_PRIORITY[b.tone];
        if (diff !== 0) return diff;
        return a.area.localeCompare(b.area, "ko-KR");
      });
      setDueSummary({ loading: false, items, error: null });
    } catch (error) {
        console.error("교체 알림 정보를 불러오지 못했습니다.", error);
        setDueSummary({ loading: false, items: [], error: "교체 알림 정보를 불러오지 못했습니다." });
    }
  }, [vehicle, currentOdo]);

  useEffect(() => {
    if (!vehicle || !odoReady) return;
    loadDueSummary();
  }, [vehicle, odoReady, loadDueSummary]);

  useEffect(() => {
    if (!location.state?.openOdo) return;
    setOdoEditing(true);
    setOdoDate((prev) => prev || new Date().toISOString().slice(0, 10));
    setOdoKm((prev) => prev || (vehicle?.odo_km ? String(vehicle.odo_km) : ""));
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate, vehicle?.odo_km]);

  const handleOdoSave = () => {
    if (!vehicle || !odoDate || !odoKm) return;
    api
      .post("/odometer/update", { vehicleId: vehicle.id, date: odoDate, odo_km: Number(odoKm) })
      .then(() => {
        setCurrentOdo(Number(odoKm));
        setOdoEditing(false);
        setOdoDate("");
        setOdoKm("");
        fetchDistance();
        loadDueSummary();
        if (onVehicleRefresh) {
          onVehicleRefresh(vehicle.id);
        }
      })
      .catch(() => {
        showToast({ tone: "error", message: "주행거리 업데이트 중 오류가 발생했습니다. 다시 시도해주세요." });
      });
  };

  const formattedExpense = `${Number(expenseMonthly || 0).toLocaleString()} 원`
  const energyMetric = (() => {
    if (vehicle?.fuelType === "ev") {
      return {
        label: "평균 전비 계산 결과",
        icon: "ev_station",
        value: chargeStats?.avg_km_per_kwh != null ? `${Number(chargeStats.avg_km_per_kwh).toFixed(1)} km/kWh` : "집계 없음",
      };
    }
    if (vehicle?.fuelType === "phev") {
      return {
        label: "주유/충전 기록 상태",
        icon: "energy_savings_leaf",
        value: chargeStats?.total_kwh != null && Number(chargeStats.total_kwh) > 0 ? `충전 ${Number(chargeStats.total_kwh).toFixed(1)} kWh` : "집계 없음",
      };
    }
    return {
      label: "평균 연비 계산 결과",
      icon: "local_gas_station",
      value: stats?.avg_km_per_l != null ? `${Number(stats.avg_km_per_l).toFixed(1)} km/L` : "집계 없음",
    };
  })();
  const metrics = useMemo(
    () => [
      { key: "expense", label: "이번 달 집계 지출", icon: "payments", value: formattedExpense },
      { key: "distance", label: distanceLabel, icon: "trending_up", value: formattedDistance },
      { key: "fuel", ...energyMetric },
    ],
    [distanceLabel, formattedDistance, formattedExpense, energyMetric],
  )

  const vehicleTitle = vehicle?.plate_no || "차량 번호를 입력해주세요"
  const vehicleSubtitle = [vehicle?.maker, vehicle?.model, vehicle?.fuelType ? FUEL_TYPE_LABEL[vehicle.fuelType] || vehicle.fuelType : null, vehicle?.year]
    .filter(Boolean)
    .join(" · ") || "차량 기본 정보를 입력해주세요"
  const primaryOdo = currentOdo ?? vehicle?.odo_km ?? null
  const currentMileageLabel =
    primaryOdo != null ? `${Number(primaryOdo).toLocaleString()} km` : "주행거리 정보 없음"

  const dueLoading = dueSummary.loading || !odoReady;
  const dueCount = dueSummary.items.filter((item) => item.tone === "danger" || item.tone === "warn").length;

  return (
    <div className="space-y-6 px-4 py-6">
      <section className="rounded-2xl border border-border-light bg-surface-light p-5 shadow-card">
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-text-light">{vehicleTitle}</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm text-subtext-light">{vehicleSubtitle}</p>
                  <div className="inline-flex items-center gap-3 rounded-full border border-border-light bg-background-light/80 px-3 py-1 text-xs text-subtext-light">
                    <span className="font-semibold text-text-light">{currentMileageLabel}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOdoEditing((prev) => !prev)}
                    className="flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white transition hover:bg-primary/90"
                  >
                    <span className="material-symbols-outlined text-base">{odoEditing ? "close" : "speed"}</span>
                    {odoEditing ? "입력 취소" : "주행거리 업데이트"}
                  </button>
                </div>
              </div>
              <div className="inline-flex max-w-full flex-nowrap items-center gap-2 whitespace-nowrap rounded-full bg-primary/5 px-3 py-1 text-[11px] font-semibold text-primary sm:text-xs">
                {dueLoading ? (
                  <>
                    <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
                    <span>불러오는 중</span>
                  </>
                ) : (
                  <>
                    <span className={`h-2 w-2 rounded-full ${dueCount > 0 ? "bg-amber-500" : "bg-emerald-500"}`} />
                    <span>{dueCount > 0 ? "점검 필요" : "정상 상태"}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              
              {dueLoading ? (
                <div className="flex h-9 w-full flex-nowrap items-center justify-center gap-2 overflow-hidden rounded-full border border-border-light bg-background-light px-4 text-[11px] font-semibold text-subtext-light sm:w-auto sm:px-8 sm:text-xs">
                  <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-subtext-light/25 border-t-subtext-light" />
                  <span className="whitespace-nowrap">데이터 불러오는 중...</span>
                </div>
              ) : null}

              {!dueLoading && !dueSummary.error && dueCount > 0 && (
                <button
                  type="button"
                  onClick={() => setDueModalOpen(true)}
                  className="flex h-9 w-full flex-nowrap items-center justify-center gap-2 overflow-hidden rounded-full border border-amber-200 bg-amber-50 px-4 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100 sm:w-auto sm:px-8 sm:text-xs"
                >
                  <span className="material-symbols-outlined shrink-0 text-base">warning</span>
                  <span className="whitespace-nowrap">교체가 필요한 항목이 있습니다. 클릭해서 확인해보세요.</span>
                </button>
              )}
            </div>
          </div>
          {dueSummary.error && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {dueSummary.error}
            </div>
          )}

          {odoEditing && (
            <div className="grid gap-3 rounded-xl border border-border-light bg-background-light/70 p-4 sm:grid-cols-3">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-text-light">기록 날짜</span>
                <input
                  type="date"
                  value={odoDate}
                  onChange={(e) => setOdoDate(e.target.value)}
                  className="h-11 rounded-lg border border-border-light px-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm sm:col-span-2">
                <span className="font-medium text-text-light">주행거리 (km)</span>
                <input
                  type="number"
                  value={odoKm}
                  onChange={(e) => setOdoKm(e.target.value)}
                  placeholder="예: 130000"
                  className="h-11 rounded-lg border border-border-light px-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <div className="sm:col-span-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleOdoSave}
                  className="flex h-11 flex-1 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-white transition hover:bg-primary/90"
                >
                  주행거리 저장
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOdoEditing(false);
                    setOdoDate("");
                    setOdoKm("");
                  }}
                  className="flex h-11 flex-1 items-center justify-center rounded-lg border border-border-light text-sm font-semibold text-subtext-light transition hover:text-primary"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
      <section className="rounded-xl border border-border-light bg-white px-4 py-3 text-center text-xs font-semibold text-subtext-light shadow-sm">
        광고 영역
      </section>
      <section className="grid grid-cols-3 gap-3">
          {metrics.map((metric) => (
            <div
              key={metric.key}
              className="flex min-w-0 flex-col items-center gap-1 rounded-2xl border border-border-light bg-primary/5 p-3 text-left shadow-card"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-primary">
                  {metric.icon}
                </span>
                <span className="text-xs font-semibold text-subtext-light">
                  {metric.label}
                </span>
              </div>
              <span className="text-sm font-bold text-text-light">
                {metric.value}
              </span>
            </div>
          ))}
        </section>

      <section className="rounded-2xl border border-primary bg-gradient-to-b from-primary/10 via-primary/5 to-surface-light p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-text-light">관심 패널 바로가기</h3>
          <span className="text-xs text-primary">필요한 기능을 빠르게 열어보세요</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {menu.map((m) => (
            <button
              key={m.key}
              type="button"
              className="aspect-square rounded-2xl bg-white/90 p-4 text-text-light shadow-card transition hover:bg-primary hover:text-white"
              onClick={() => navigate(m.path)}
            >
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-3xl">{m.icon}</span>
                <span className="text-sm font-semibold">{m.label}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <DueItemsSheet
        open={dueModalOpen}
        onClose={() => setDueModalOpen(false)}
        summary={dueSummary}
        onReload={loadDueSummary}
      />
    </div>
  );
}

function DueItemsSheet({ open, onClose, summary, onReload }) 

{
  if (!open) return null;
  const { items, loading, error } = summary;
  const visibleItems = items.filter((item) => item.tone === "danger" || item.tone === "warn");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-3xl bg-surface-light p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-light">점검 항목</h2>
            <p className="text-sm text-subtext-light">교체 또는 점검이 필요한 항목만 표시합니다.</p>
          </div>
          <button type="button" className="text-subtext-light transition hover:text-text-light" onClick={onClose}>
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          {loading ? (
            <div className="rounded-2xl border border-border-light bg-background-light/80 px-4 py-5 text-center text-sm text-subtext-light">
              점검 항목을 불러오는 중...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-600">{error}</div>
          ) : visibleItems.length === 0 ? (
            <div className="rounded-2xl border border-border-light bg-background-light/70 px-4 py-5 text-center text-sm text-subtext-light">
              교체 또는 점검이 필요한 항목이 없습니다.
            </div>
          ) : (
            <ul className="space-y-3">
              {visibleItems.map((item) => (
                <li key={item.id} className="rounded-2xl border border-border-light bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-subtext-light">{item.area}</p>
                      <p className="text-base font-semibold text-text-light">{item.name}</p>
                      <p className="mt-1 text-sm text-subtext-light">{item.status}</p>
                    </div>
                    <span
                      className={
                        item.tone === "danger"
                          ? "rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700"
                          : item.tone === "warn"
                          ? "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"
                          : item.tone === "ok"
                          ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
                          : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                      }
                    >
                      {item.tone === "danger" ? "위험" : item.tone === "warn" ? "교체 필요" : item.tone === "ok" ? "양호" : "작성 필요"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
            onClick={onClose}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

export async function summarizeConsumableDue(vehicleId, currentMileage) {
  const chunks = await Promise.all(
    CONSUMABLE_CATEGORY_META.map(async (meta) => {
      const [itemsRes, historyRes] = await Promise.all([
        api.get("/consumables/items", { params: { vehicleId, category: meta.category } }),
        api.get("/consumables/search", {
          params: { vehicleId, category: meta.category, sort: "id", order: "desc" },
        }),
      ]);
      const items = itemsRes.data || [];
      const history = historyRes.data || [];
      const { latestOdo, latestDate } = summarizeOdoFromHistory(history);
      return items
        .map((item) => {
          const status = computeConsumableStatus({
            item,
            currentMileage,
            latestOdo: latestOdo[item.kind],
            latestDate: latestDate[item.kind],
          });
          if (status.tone === "danger" || status.tone === "warn" || status.tone === "muted") {
            return {
              id: `${meta.category}-${item.kind || "unknown"}`,
              area: meta.panelLabel || meta.category,
              name: item.kind || meta.panelLabel || meta.category,
              status: status.message,
              tone: status.tone,
            };
          }
          return null;
        })
        .filter(Boolean);
    }),
  );

  return chunks.flat();
}

export async function summarizeTireDue(vehicleId) {
  try {
    const { data } = await api.get("/tires/summary", { params: { vehicleId } });
    const tires = data?.tires || [];
    return tires
      .filter((tire) => Array.isArray(tire.warnings) && tire.warnings.length)
      .map((tire) => {
        const missingOnly =
          tire.warnings.length > 0 &&
          tire.warnings.every((warning) =>
            [
              "No tire metadata registered yet.",
              "Measurement timestamp missing.",
              "No pressure measurement recorded yet.",
            ].includes(warning),
          );
        return {
          id: `tire-${tire.position || tire.position_label || Math.random().toString(36).slice(2, 8)}`,
          area: "타이어 관리",
          name: tire.position_label || tire.position,
          status: tire.warnings.map(localizeTireWarning).join(" "),
          tone: missingOnly ? "muted" : tire.status === "critical" ? "danger" : "warn",
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.warn("타이어 요약 정보를 불러오지 못했습니다.", error);
    return [];
  }
}

function summarizeOdoFromHistory(history) {
  const latestOdo = {};
  const latestDate = {};
  (history || []).forEach((entry) => {
    const kind = entry.kind;
    if (!kind) return;
    if (entry.odo_km != null) {
      const odo = Number(entry.odo_km);
      if (Number.isFinite(odo)) {
        latestOdo[kind] = latestOdo[kind] != null ? Math.max(latestOdo[kind], odo) : odo;
      }
    }
    if (entry.date) {
      const dateKey = String(entry.date).slice(0, 10);
      if (!latestDate[kind] || latestDate[kind] < dateKey) {
        latestDate[kind] = dateKey;
      }
    }
  });
  return { latestOdo, latestDate };
}

function slugifyModel(modelName) {
  if (!modelName) return null;
  return String(modelName)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toIntOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? Math.trunc(num) : null;
}

function monthsDiffFromNow(ymd) {
  if (!ymd) return null;
  const [y, m, d] = String(ymd).split("-").map(Number);
  if (!y || !m || !d) return null;
  const base = new Date(y, m - 1, d);
  if (!Number.isFinite(base.getTime())) return null;
  const now = new Date();
  return (now.getFullYear() - base.getFullYear()) * 12 + (now.getMonth() - base.getMonth());
}

function computeConsumableStatus({ item, currentMileage, latestOdo, latestDate }) {
  const mode = item.mode || "distance";

  if (mode === "distance") {
    const baseOdo = toIntOrNull(item.lastOdo ?? latestOdo ?? item.last_odo_km ?? null);
    const cycleKm = toIntOrNull(item.cycleKm ?? item.cycle_km);
    if (currentMileage != null && baseOdo != null && cycleKm) {
      const used = Number(currentMileage) - baseOdo;
      const remain = cycleKm - used;
      if (!Number.isFinite(remain)) {
        return { tone: "muted", message: "작성 필요" };
      }
      if (remain <= 0) {
        return { tone: "danger", message: "즉시 교체가 필요합니다." };
      }
      if (remain <= Math.max(500, cycleKm * 0.2)) {
        return {
          tone: "warn",
          message: `${Math.max(0, Math.round(remain)).toLocaleString()} km 이내 교체 권장`,
        };
      }
      return {
        tone: "ok",
        message: `${Math.max(0, Math.round(remain)).toLocaleString()} km 여유가 있습니다.`,
      };
    }
    return { tone: "muted", message: "작성 필요" };
  }

  const baseDate = item.lastDate || item.last_date || latestDate || null;
  const months = monthsDiffFromNow(baseDate);
  const cycleMonths = toIntOrNull(item.cycleMonths ?? item.cycle_months);
  if (months != null && cycleMonths) {
    const remain = cycleMonths - months;
    if (!Number.isFinite(remain)) {
      return { tone: "muted", message: "작성 필요" };
    }
    if (remain <= 0) {
      return { tone: "danger", message: "즉시 교체가 필요합니다." };
    }
    if (remain <= Math.max(1, Math.round(cycleMonths * 0.2))) {
      return { tone: "warn", message: `${Math.max(0, remain)}개월 이내 교체 권장` };
    }
    return { tone: "ok", message: `${Math.max(0, remain)}개월 여유가 있습니다.` };
  }
  return { tone: "muted", message: "작성 필요" };
}

function localizeTireWarning(message) {
  const mapping = {
    "No tire metadata registered yet.": "기본 정보 작성 필요",
    "Last pressure check was over 45 days ago.": "최근 공기압 점검 기록이 45일 이상 지났습니다.",
    "Measurement timestamp missing.": "측정 시각 작성 필요",
    "Pressure is far outside the recommended range.": "공기압이 권장 범위를 크게 벗어났습니다.",
    "Pressure is outside the recommended range.": "공기압이 권장 범위를 벗어났습니다.",
    "Tread depth is at or below 2mm. Replace immediately.": "트레드 깊이가 2mm 이하입니다. 즉시 교체가 필요합니다.",
    "Tread depth is at or below 3mm. Plan a replacement soon.": "트레드 깊이가 3mm 이하입니다. 교체를 준비해주세요.",
    "No pressure measurement recorded yet.": "공기압 측정 기록 작성 필요",
    "Tire has been in service for more than 5 years.": "장착 후 5년 이상 경과했습니다.",
    "Tire has covered more than 60,000 km since installation.": "장착 후 60,000km 이상 주행했습니다.",
  };
  return mapping[message] || message || "작성 필요";
}
