import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/client";
import { summarizeConsumableDue, summarizeLegalDue, summarizeTireDue } from "./Dashboard";

const TONE_PRIORITY = { danger: 0, warn: 1, muted: 2, ok: 3 };

function badgeClass(tone) {
  if (tone === "danger") return "bg-red-100 text-red-700";
  if (tone === "warn") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function resolveRoute(item) {
  switch (item.area) {
    case "오일 관리":
      return "/oil";
    case "필터 관리":
      return "/filter";
    case "소모품 관리":
      return "/other";
    case "타이어 관리":
      return "/tire";
    case "법적 서류":
      return "/legal";
    case "에너지 관리":
      return "/fuel";
    case "대시보드":
      return "/";
    default:
      return "/";
  }
}

function energyRecordLabel(fuelType) {
  if (fuelType === "ev") return "충전 기록";
  if (fuelType === "lpg") return "LPG 충전 기록";
  return "주유 기록";
}

export default function TasksPanel({ vehicle, legalSummary = {} }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ avg_km_per_l: null, total_cost: null });
  const [currentOdo, setCurrentOdo] = useState(null);
  const [dueItems, setDueItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [setupCollapsed, setSetupCollapsed] = useState(false);

  useEffect(() => {
    if (!vehicle?.id) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const [statsRes, odoRes] = await Promise.all([
          api.get("/fuel/stats", { params: { vehicleId: vehicle.id } }),
          api.get("/odometer/current", { params: { vehicleId: vehicle.id } }),
        ]);
        const odo = odoRes.data?.odo_km ?? vehicle?.odo_km ?? null;
        const [consumableDue, tireDue] = await Promise.all([
          summarizeConsumableDue(vehicle.id, odo),
          summarizeTireDue(vehicle.id),
        ]);
        const legalDue = summarizeLegalDue(legalSummary);

        if (cancelled) return;
        setStats(statsRes.data || { avg_km_per_l: null, total_cost: null });
        setCurrentOdo(odo);
        setDueItems([...consumableDue, ...tireDue, ...legalDue]);
      } catch (error) {
        console.error("할 일 데이터를 불러오지 못했습니다.", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [vehicle?.id, vehicle?.odo_km, legalSummary]);

  const setupItems = useMemo(
    () => [
      {
        key: "odometer",
        label: "현재 주행거리 입력",
        done: currentOdo != null,
        actionLabel: "대시보드 열기",
        action: () => navigate("/", { state: { openOdo: true } }),
      },
      {
        key: "insurance",
        label: "보험 만기일 등록",
        done: Boolean(legalSummary?.insurance?.expiry_date),
        actionLabel: "법적 서류 열기",
        action: () => navigate("/legal"),
      },
      {
        key: "inspection",
        label: "정기검사 일정 등록",
        done: Boolean(legalSummary?.inspection?.next_inspection_date || legalSummary?.inspection?.next),
        actionLabel: "법적 서류 열기",
        action: () => navigate("/legal"),
      },
      {
        key: "tax",
        label: "자동차세 납부기한 등록",
        done: Boolean(legalSummary?.tax?.tax_due_date),
        actionLabel: "법적 서류 열기",
        action: () => navigate("/legal"),
      },
      {
        key: "fuel",
        label: `첫 ${energyRecordLabel(vehicle?.fuelType)} 추가`,
        done: stats?.total_cost != null && Number(stats.total_cost) > 0,
        actionLabel: "에너지 관리 열기",
        action: () => navigate("/fuel"),
      },
    ],
    [currentOdo, legalSummary, navigate, stats?.total_cost, vehicle?.fuelType],
  );

  const allSetupDone = useMemo(() => setupItems.every((item) => item.done), [setupItems]);

  useEffect(() => {
    setSetupCollapsed(allSetupDone);
  }, [allSetupDone]);

  const urgentItems = useMemo(
    () =>
      dueItems
        .filter((item) => item.tone === "danger" || item.tone === "warn")
        .sort((a, b) => TONE_PRIORITY[a.tone] - TONE_PRIORITY[b.tone]),
    [dueItems],
  );

  const inputNeededItems = useMemo(() => {
    const items = [...dueItems.filter((item) => item.tone === "muted")];

    if (currentOdo == null) {
      items.unshift({
        id: "missing-odometer",
        area: "대시보드",
        name: "현재 주행거리",
        status: "현재 주행거리 작성 필요",
        tone: "muted",
      });
    }
    if (!legalSummary?.insurance?.expiry_date) {
      items.push({
        id: "missing-insurance",
        area: "법적 서류",
        name: "보험 만기일",
        status: "보험 만기일 작성 필요",
        tone: "muted",
      });
    }
    if (!legalSummary?.inspection?.next_inspection_date && !legalSummary?.inspection?.next) {
      items.push({
        id: "missing-inspection",
        area: "법적 서류",
        name: "정기검사 일정",
        status: "정기검사 일정 작성 필요",
        tone: "muted",
      });
    }
    if (!legalSummary?.tax?.tax_due_date) {
      items.push({
        id: "missing-tax",
        area: "법적 서류",
        name: "자동차세 납부기한",
        status: "자동차세 납부기한 작성 필요",
        tone: "muted",
      });
    }
    if (!stats || stats.total_cost == null || Number(stats.total_cost) === 0) {
      items.push({
        id: "missing-energy",
        area: "에너지 관리",
        name: energyRecordLabel(vehicle?.fuelType),
        status: `첫 ${energyRecordLabel(vehicle?.fuelType)} 작성 필요`,
        tone: "muted",
      });
    }

    const deduped = new Map();
    items.forEach((item) => {
      if (!deduped.has(item.id)) deduped.set(item.id, item);
    });
    return [...deduped.values()];
  }, [currentOdo, dueItems, legalSummary, stats, vehicle?.fuelType]);

  if (!vehicle) {
    return <div className="px-4 py-6 text-sm text-subtext-light">차량을 다시 선택해주세요.</div>;
  }

  return (
    <div className="space-y-5 px-4 py-6 pb-28">
      <section className="rounded-2xl border border-border-light bg-surface-light p-5 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-text-light">초기 설정 가이드</h2>
            <p className="mt-1 text-sm text-subtext-light">
              기본 정보가 채워질수록 알림 기준과 점검 안내가 더 정확해집니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              미완료 {setupItems.filter((item) => !item.done).length}건
            </span>
            {allSetupDone ? (
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border-light text-subtext-light transition hover:text-primary"
                onClick={() => setSetupCollapsed((prev) => !prev)}
                aria-label={setupCollapsed ? "초기 설정 펼치기" : "초기 설정 접기"}
              >
                <span className="material-symbols-outlined text-base">{setupCollapsed ? "expand_more" : "expand_less"}</span>
              </button>
            ) : null}
          </div>
        </div>

        {!setupCollapsed ? (
          <div className="mt-4 space-y-3">
            {setupItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-3 rounded-2xl border border-border-light bg-background-light px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-light">{item.label}</p>
                  <p className="mt-1 text-xs text-subtext-light">{item.done ? "완료" : "작성 필요"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined ${item.done ? "text-emerald-600" : "text-amber-600"}`}>
                    {item.done ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  {!item.done ? (
                    <button type="button" className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white" onClick={item.action}>
                      {item.actionLabel}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-border-light bg-background-light px-4 py-3 text-sm text-subtext-light">
            초기 설정이 모두 완료되었습니다.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border-light bg-surface-light p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-light">지금 해야 할 일</h2>
            <p className="mt-1 text-sm text-subtext-light">긴급 항목과 작성 필요 항목을 분리해서 보여줍니다.</p>
          </div>
          {loading ? <span className="text-xs text-subtext-light">불러오는 중...</span> : null}
        </div>

        <div className="mt-4 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-text-light">긴급 교체/점검</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${urgentItems.length ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                {urgentItems.length}건
              </span>
            </div>
            {urgentItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border-light bg-background-light px-4 py-4 text-sm text-subtext-light">
                지금 바로 확인해야 할 긴급 항목은 없습니다.
              </div>
            ) : (
              urgentItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="w-full rounded-2xl border border-border-light bg-background-light px-4 py-3 text-left transition hover:border-primary/40"
                  onClick={() => navigate(resolveRoute(item))}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-subtext-light">{item.area}</p>
                      <p className="text-sm font-semibold text-text-light">{item.name}</p>
                      <p className="mt-1 text-xs text-subtext-light">{item.status}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass(item.tone)}`}>
                      {item.tone === "danger" ? "긴급" : "주의"}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-text-light">값 입력이 필요한 항목</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {inputNeededItems.length}건
              </span>
            </div>
            {inputNeededItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border-light bg-background-light px-4 py-4 text-sm text-subtext-light">
                추가로 입력이 필요한 기본 항목은 없습니다.
              </div>
            ) : (
              inputNeededItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="w-full rounded-2xl border border-border-light bg-background-light px-4 py-3 text-left transition hover:border-primary/40"
                  onClick={() => navigate(resolveRoute(item))}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-subtext-light">{item.area}</p>
                      <p className="text-sm font-semibold text-text-light">{item.name}</p>
                      <p className="mt-1 text-xs text-subtext-light">{item.status}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      작성 필요
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
