import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { summarizeConsumableDue, summarizeTireDue } from "./Dashboard";

function toneClass(tone) {
  if (tone === "danger") return "bg-red-100 text-red-700";
  if (tone === "warn") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

export default function TasksPanel({ vehicle, legalSummary = {} }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ avg_km_per_l: null, total_cost: null });
  const [currentOdo, setCurrentOdo] = useState(null);
  const [dueItems, setDueItems] = useState([]);
  const [loading, setLoading] = useState(true);

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
        if (cancelled) return;
        setStats(statsRes.data || { avg_km_per_l: null, total_cost: null });
        setCurrentOdo(odo);
        setDueItems([...consumableDue, ...tireDue]);
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
  }, [vehicle?.id, vehicle?.odo_km]);

  const onboardingSteps = useMemo(
    () => [
      { key: "odometer", label: "현재 주행거리 입력", done: currentOdo != null, actionLabel: "대시보드에서 입력", action: () => navigate("/") },
      { key: "insurance", label: "보험 정보 등록", done: Boolean(legalSummary?.insurance?.expiry_date), actionLabel: "법적 서류 열기", action: () => navigate("/legal") },
      { key: "inspection", label: "정기검사 일정 등록", done: Boolean(legalSummary?.inspection?.next_inspection_date || legalSummary?.inspection?.next), actionLabel: "법적 서류 열기", action: () => navigate("/legal") },
      { key: "fuel", label: "첫 주유 기록 추가", done: stats?.total_cost != null && Number(stats.total_cost) > 0, actionLabel: "주유 관리 열기", action: () => navigate("/fuel") },
    ],
    [currentOdo, legalSummary, navigate, stats?.total_cost],
  );

  const actionQueue = useMemo(() => {
    const items = [];
    if (dueItems.length) {
      items.push({
        key: "due",
        title: `교체·점검 필요 항목 ${dueItems.length}건`,
        description: "교체 시점이 가까운 항목부터 점검하세요.",
        tone: "danger",
        actionLabel: "관련 화면 열기",
        action: () => navigate("/tire"),
      });
    }
    if (!stats || stats.total_cost == null || Number(stats.total_cost) === 0) {
      items.push({
        key: "fuel",
        title: "주유 기록이 아직 없습니다",
        description: "첫 주유 기록을 추가하면 연비와 비용 분석이 시작됩니다.",
        tone: "warn",
        actionLabel: "주유 관리",
        action: () => navigate("/fuel"),
      });
    }
    if (!legalSummary?.insurance?.expiry_date || !legalSummary?.inspection?.next_inspection_date) {
      items.push({
        key: "legal",
        title: "법적 일정 정보가 부족합니다",
        description: "보험과 정기검사 정보를 입력하면 만기 알림 품질이 좋아집니다.",
        tone: "warn",
        actionLabel: "법적 서류",
        action: () => navigate("/legal"),
      });
    }
    return items;
  }, [dueItems.length, legalSummary, navigate, stats]);

  if (!vehicle) {
    return <div className="px-4 py-6 text-sm text-subtext-light">차량을 다시 선택해주세요.</div>;
  }

  return (
    <div className="space-y-5 px-4 py-6 pb-28">
      <section className="rounded-2xl border border-border-light bg-surface-light p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-light">초기 설정 가이드</h2>
            <p className="mt-1 text-sm text-subtext-light">앱 사용에 필요한 기본 정보를 우선 채워주세요.</p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            미완료 {onboardingSteps.filter((step) => !step.done).length}건
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {onboardingSteps.map((step) => (
            <div key={step.key} className="flex items-center justify-between gap-3 rounded-2xl border border-border-light bg-background-light px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-light">{step.label}</p>
                <p className="mt-1 text-xs text-subtext-light">{step.done ? "완료됨" : "설정 필요"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined ${step.done ? "text-emerald-600" : "text-amber-600"}`}>
                  {step.done ? "check_circle" : "radio_button_unchecked"}
                </span>
                {!step.done ? (
                  <button type="button" className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white" onClick={step.action}>
                    {step.actionLabel}
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border-light bg-surface-light p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-light">지금 해야 할 일</h2>
            <p className="mt-1 text-sm text-subtext-light">교체 임박 항목과 미입력 정보를 분리해서 확인하세요.</p>
          </div>
          {loading ? <span className="text-xs text-subtext-light">불러오는 중...</span> : null}
        </div>

        <div className="mt-4 space-y-3">
          {actionQueue.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border-light bg-background-light px-4 py-6 text-center text-sm text-subtext-light">
              지금 바로 처리할 항목이 없습니다.
            </div>
          ) : (
            actionQueue.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-3 rounded-2xl border border-border-light bg-background-light px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-text-light">{item.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${toneClass(item.tone)}`}>
                      {item.tone === "danger" ? "긴급" : "권장"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-subtext-light">{item.description}</p>
                </div>
                <button type="button" className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white" onClick={item.action}>
                  {item.actionLabel}
                </button>
              </div>
            ))
          )}
        </div>

        {dueItems.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold text-text-light">교체·점검 상세</p>
            {dueItems.slice(0, 6).map((item) => (
              <div key={item.id} className="rounded-2xl border border-border-light bg-white px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-subtext-light">{item.area}</p>
                    <p className="text-sm font-semibold text-text-light">{item.name}</p>
                    <p className="mt-1 text-xs text-subtext-light">{item.status}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${toneClass(item.tone)}`}>
                    {item.tone === "danger" ? "긴급" : "주의"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
