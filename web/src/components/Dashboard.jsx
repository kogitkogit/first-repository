import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useDrivingAnalysis } from "./DrivingAnalysisPanel";
import { CONSUMABLE_CATEGORY_META } from "../constants/consumables";
import { fetchCostSnapshot } from "../utils/costs";
import { buildVehicleImageUrl } from "../utils/vehicleImages";

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

export default function Dashboard({ vehicle, onVehicleRefresh, costRefreshKey = 0 }) {
  const [stats, setStats] = useState({ avg_km_per_l: null, total_cost: null });
  const [expenseMonthly, setExpenseMonthly] = useState(0);
  const [currentOdo, setCurrentOdo] = useState(null);
  const [odoEditing, setOdoEditing] = useState(false);
  const [odoDate, setOdoDate] = useState("");
  const [odoKm, setOdoKm] = useState("");
  const [dueSummary, setDueSummary] = useState({ loading: false, items: [], error: null });
  const [dueModalOpen, setDueModalOpen] = useState(false);

  const analysis = useDrivingAnalysis(vehicle);
  const {
    distanceLabel,
    formattedDistance,
    fetchDistance,
  } = analysis;

  const navigate = useNavigate();

  useEffect(() => {
    if (!vehicle) return;

    api
      .get("/fuel/stats", { params: { vehicleId: vehicle.id } })
      .then((r) => setStats(r.data))
      .catch(() => {
        setStats({ avg_km_per_l: null, total_cost: null });
      });

    api
      .get("/odometer/current", { params: { vehicleId: vehicle.id } })
      .then((r) => setCurrentOdo(r.data?.odo_km))
      .catch(() => {});
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
    if (!vehicle) return;
    loadDueSummary();
  }, [vehicle, loadDueSummary]);

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
        alert("주행거리 업데이트 중 오류가 발생했습니다. 다시 시도해주세요.");
      });
  };

  const formattedExpense = `${Number(expenseMonthly || 0).toLocaleString()} 원`
  const formattedFuel =
    stats?.avg_km_per_l != null ? `${Number(stats.avg_km_per_l).toFixed(1)} km/L` : "집계 없음"
  const metrics = useMemo(
    () => [
      { key: "expense", label: "이번 달 집계 지출", icon: "payments", value: formattedExpense },
      { key: "distance", label: distanceLabel, icon: "trending_up", value: formattedDistance },
      { key: "fuel", label: "평균 연비 계산 결과", icon: "local_gas_station", value: formattedFuel },
    ],
    [distanceLabel, formattedDistance, formattedExpense, formattedFuel],
  )

  const vehicleTitle = vehicle?.plate_no || "차량 번호를 입력해주세요"
  const vehicleSubtitle = [vehicle?.maker, vehicle?.model, vehicle?.year]
    .filter(Boolean)
    .join(" · ") || "차량 기본 정보를 입력해주세요"
  const vehicleImage = buildVehicleImageUrl(vehicle?.model, api.defaults.baseURL)

  const primaryOdo = currentOdo ?? vehicle?.odo_km ?? null
  const currentMileageLabel =
    primaryOdo != null ? `${Number(primaryOdo).toLocaleString()} km` : "주행거리 정보 없음"

  const dueCount = dueSummary.items.length;

  return (
    <div className="space-y-6 px-4 py-6">
      <section className="relative overflow-hidden rounded-2xl border border-border-light bg-surface-light p-5 shadow-card">
        {vehicleImage ? (
          <div className="pointer-events-none absolute top-4 right-4 h-28 w-28 overflow-hidden rounded-2xl border border-border-light/60 bg-white/80 shadow-card">
            <img src={vehicleImage} alt="선택한 차량" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="pointer-events-none absolute top-4 right-4 flex h-28 w-28 items-center justify-center rounded-2xl border border-border-light/60 bg-white/70 text-subtext-light">
            <span className="material-symbols-outlined text-4xl">directions_car</span>
          </div>
        )}

        <div className="space-y-4 pr-32">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-text-light">{vehicleTitle}</h2>
              <div className="flex items-center gap-2">
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
            <div className="flex flex-wrap items-center gap-2">
              
              {!dueSummary.loading && !dueSummary.error && dueCount > 0 && (
                <button
                  type="button"
                  onClick={() => setDueModalOpen(true)}
                  className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-6 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                >
                  <span className="material-symbols-outlined text-base">warning</span>
                  <span>교체가 필요한 항목이 있습니다. 클릭해서 확인해보세요.</span>
                </button>
              )}
            </div>
          </div>

          {dueSummary.loading && (
            <div className="flex items-center gap-2 rounded-xl border border-border-light bg-background-light/70 px-4 py-3 text-sm text-subtext-light">
              <span className="material-symbols-outlined text-base">hourglass_top</span>
              <span>교체 알림 정보를 불러오는 중입니다...</span>
            </div>
          )}

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-3xl bg-surface-light p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-light">교체 필요 항목</h2>
            <p className="text-sm text-subtext-light">교체가 필요한 항목들을 한눈에 확인해보세요.</p>
          </div>
          <button type="button" className="text-subtext-light transition hover:text-text-light" onClick={onClose}>
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-border-light bg-background-light/80 px-4 py-5 text-center text-sm text-subtext-light">
              교체 필요 항목 불러오는 중...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-600">{error}</div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-border-light bg-background-light/70 px-4 py-5 text-center text-sm text-subtext-light">
              교체가 필요한 항목이 없습니다!
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
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
                          : "rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600"
                      }
                    >
                      {item.tone === "danger" ? "위험" : item.tone === "warn" ? "교체 필요" : item.tone === "ok" ? "양호" : "이상 없음"}
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
            className="rounded-full border border-border-light px-4 py-2 text-sm text-subtext-light transition hover:text-primary"
            onClick={onReload}
            disabled={loading}
          >
            새로고침
          </button>
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

async function summarizeConsumableDue(vehicleId, currentMileage) {
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
          if (status.tone === "danger" || status.tone === "warn") {
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

async function summarizeTireDue(vehicleId) {
  try {
    const { data } = await api.get("/tires/summary", { params: { vehicleId } });
    const tires = data?.tires || [];
    return tires
      .filter((tire) => Array.isArray(tire.warnings) && tire.warnings.length)
      .map((tire) => {
        const hasMetadata = Boolean(
          tire.brand ||
          tire.model ||
          tire.size ||
          tire.dot_code ||
          tire.installed_at ||
          tire.installed_odo
        );
        const hasHistory = Boolean(tire.last_measurement || tire.last_service);
        if (!hasMetadata && !hasHistory) {
          return null;
        }
        return {
          id: `tire-${tire.position || tire.position_label || Math.random().toString(36).slice(2, 8)}`,
          area: "타이어 관리",
          name: tire.position_label || tire.position,
          status: tire.warnings.join(" "),
          tone: tire.status === "critical" ? "danger" : "warn",
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
        return { tone: "muted", message: "주행 정보를 확인해주세요." };
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
    return { tone: "muted", message: "최근 주행거리 데이터를 입력해주세요." };
  }

  const baseDate = item.lastDate || item.last_date || latestDate || null;
  const months = monthsDiffFromNow(baseDate);
  const cycleMonths = toIntOrNull(item.cycleMonths ?? item.cycle_months);
  if (months != null && cycleMonths) {
    const remain = cycleMonths - months;
    if (!Number.isFinite(remain)) {
      return { tone: "muted", message: "정확한 교체 시기를 계산할 수 없습니다." };
    }
    if (remain <= 0) {
      return { tone: "danger", message: "즉시 교체가 필요합니다." };
    }
    if (remain <= Math.max(1, Math.round(cycleMonths * 0.2))) {
      return { tone: "warn", message: `${Math.max(0, remain)}개월 이내 교체 q권장` };
    }
    return { tone: "ok", message: `${Math.max(0, remain)}개월 여유가 있습니다.` };
  }
  return { tone: "muted", message: "최근 교체 기록이 필요합니다." };
}
