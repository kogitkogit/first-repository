import { useEffect, useMemo, useState } from "react";
import { fetchCostSnapshot } from "../utils/costs";

const CATEGORY_COLORS = {
  fuel: "bg-amber-100 text-amber-700",
  maintenance: "bg-sky-100 text-sky-700",
  consumable: "bg-emerald-100 text-emerald-700",
  expenses: "bg-indigo-100 text-indigo-700",
};

const currencyFormatter = new Intl.NumberFormat("ko-KR");

const toDateKey = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return null;
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return `${currencyFormatter.format(Math.round(amount))}원`;
};

const formatDisplayDate = (value) => {
  const key = toDateKey(value);
  if (!key) return "-";
  const [y, m, d] = key.split("-");
  return `${y}.${m}.${d}`;
};

const formatRangeLabel = (start, end) => {
  if (!start || !end) return "기간 선택";
  const [sy, sm, sd] = start.split("-");
  const [ey, em, ed] = end.split("-");
  if (sy === ey && sm === em) {
    return `${Number(sy)}년 ${Number(sm)}월 ${Number(sd)}일 ~ ${Number(ed)}일`;
  }
  return `${Number(sy)}년 ${Number(sm)}월 ${Number(sd)}일 ~ ${Number(ey)}년 ${Number(em)}월 ${Number(ed)}일`;
};

const addDays = (dateStr, delta) => {
  const dt = new Date(dateStr);
  dt.setDate(dt.getDate() + delta);
  return dt.toISOString().slice(0, 10);
};

const shiftMonth = (monthStr, delta) => {
  const [year, month] = monthStr.split("-").map(Number);
  const target = new Date(year, month - 1 + delta, 1);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}`;
};

const getWeekRange = (dateStr) => {
  const base = new Date(dateStr);
  if (Number.isNaN(base.getTime())) return null;
  const day = base.getDay();
  const mondayDiff = (day + 6) % 7;
  const start = new Date(base);
  start.setDate(base.getDate() - mondayDiff);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
};

const getMonthRange = (monthStr) => {
  const [year, month] = monthStr.split("-").map(Number);
  if (!year || !month) return null;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
};

const getPreviousRange = (viewMode, selectedDate, selectedMonth) => {
  if (viewMode === "week") {
    const current = getWeekRange(selectedDate);
    if (!current) return null;
    return {
      start: addDays(current.start, -7),
      end: addDays(current.end, -7),
    };
  }
  const previousMonth = shiftMonth(selectedMonth, -1);
  return getMonthRange(previousMonth);
};

export default function CostManagementPanel({ vehicle }) {
  const today = useMemo(() => new Date(), []);
  const [viewMode, setViewMode] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  });
  const [selectedDate, setSelectedDate] = useState(() => today.toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snapshot, setSnapshot] = useState({
    overallTotal: 0,
    categoryTotals: [],
    consumableDetails: [],
    entries: [],
  });
  const [previousSnapshot, setPreviousSnapshot] = useState({
    overallTotal: 0,
    categoryTotals: [],
    consumableDetails: [],
    entries: [],
  });

  const range = useMemo(() => {
    if (viewMode === "week") {
      return getWeekRange(selectedDate);
    }
    return getMonthRange(selectedMonth);
  }, [viewMode, selectedDate, selectedMonth]);
  const previousRange = useMemo(() => getPreviousRange(viewMode, selectedDate, selectedMonth), [viewMode, selectedDate, selectedMonth]);

  useEffect(() => {
    if (!vehicle?.id || !range?.start || !range?.end) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [data, previousData] = await Promise.all([
          fetchCostSnapshot({
            vehicleId: vehicle.id,
            startDate: range.start,
            endDate: range.end,
          }),
          previousRange?.start && previousRange?.end
            ? fetchCostSnapshot({
                vehicleId: vehicle.id,
                startDate: previousRange.start,
                endDate: previousRange.end,
              })
            : Promise.resolve({
                overallTotal: 0,
                categoryTotals: [],
                consumableDetails: [],
                entries: [],
              }),
        ]);
        if (cancelled) return;
        setSnapshot({
          overallTotal: data.overallTotal,
          categoryTotals: data.categoryTotals,
          consumableDetails: data.consumableDetails,
          entries: data.entries,
        });
        setPreviousSnapshot({
          overallTotal: previousData.overallTotal,
          categoryTotals: previousData.categoryTotals,
          consumableDetails: previousData.consumableDetails,
          entries: previousData.entries,
        });
      } catch (err) {
        console.error("비용 데이터를 불러오는 중 오류", err);
        if (!cancelled) setError("데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [previousRange?.end, previousRange?.start, range?.end, range?.start, vehicle?.id]);

  const rangeLabel = useMemo(() => {
    if (!range) return "기간 선택";
    return formatRangeLabel(range.start, range.end);
  }, [range]);

  const preparedCategoryTotals = useMemo(
    () =>
      snapshot.categoryTotals.map((item) => ({
        ...item,
        color: CATEGORY_COLORS[item.key] || "bg-slate-100 text-slate-600",
      })),
    [snapshot.categoryTotals],
  );
  const overallDiff = snapshot.overallTotal - previousSnapshot.overallTotal;
  const topCategory = useMemo(
    () => [...preparedCategoryTotals].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))[0] || null,
    [preparedCategoryTotals],
  );
  const recentEntries = snapshot.entries.slice(0, 3);

  if (!vehicle) {
    return (
      <div className="p-6 text-center text-sm text-subtext-light">
        차량을 다시 선택해주세요.
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background-light text-text-light">
      <div className="space-y-6 px-4 py-6 pb-28">
        <header className="rounded-2xl border border-border-light bg-surface-light p-5 shadow-card">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-bold text-text-light">비용 관리</h1>
              <p className="text-sm text-subtext-light">주유·정비·소모품 비용을 기간별로 확인하세요.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex overflow-hidden rounded-full border border-border-light">
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-semibold transition ${
                    viewMode === "week" ? "bg-primary text-white" : "bg-background-light text-subtext-light"
                  }`}
                  onClick={() => setViewMode("week")}
                >
                  주간
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-semibold transition ${
                    viewMode === "month" ? "bg-primary text-white" : "bg-background-light text-subtext-light"
                  }`}
                  onClick={() => setViewMode("month")}
                >
                  월간
                </button>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-border-light bg-background-light px-3 py-2 text-xs text-subtext-light">
                <span className="material-symbols-outlined text-base">calendar_month</span>
                <span>{rangeLabel}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {viewMode === "month" ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border-light text-subtext-light transition hover:text-primary"
                  onClick={() => setSelectedMonth((prev) => shiftMonth(prev, -1))}
                >
                  <span className="material-symbols-outlined text-xl">chevron_left</span>
                </button>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="h-9 rounded-full border border-border-light bg-background-light px-4 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border-light text-subtext-light transition hover:text-primary"
                  onClick={() => setSelectedMonth((prev) => shiftMonth(prev, 1))}
                >
                  <span className="material-symbols-outlined text-xl">chevron_right</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border-light text-subtext-light transition hover:text-primary"
                  onClick={() => setSelectedDate((prev) => addDays(prev, -7))}
                >
                  <span className="material-symbols-outlined text-xl">chevron_left</span>
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-9 rounded-full border border-border-light bg-background-light px-4 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border-light text-subtext-light transition hover:text-primary"
                  onClick={() => setSelectedDate((prev) => addDays(prev, 7))}
                >
                  <span className="material-symbols-outlined text-xl">chevron_right</span>
                </button>
              </div>
            )}
            <div className="rounded-2xl bg-primary/10 px-4 py-3 text-sm text-primary">
              <span className="font-semibold">총 지출</span>
              <div className="mt-1 text-2xl font-bold text-text-light">{formatCurrency(snapshot.overallTotal)}</div>
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-border-light bg-surface-light p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-subtext-light">이전 기간 대비</p>
            <p className="mt-2 text-lg font-bold text-text-light">
              {overallDiff === 0 ? "변동 없음" : `${Math.abs(overallDiff).toLocaleString()}원 ${overallDiff > 0 ? "증가" : "감소"}`}
            </p>
            <p className="mt-1 text-sm text-subtext-light">이전 동일 구간 총지출 {formatCurrency(previousSnapshot.overallTotal)}</p>
          </div>
          <div className="rounded-2xl border border-border-light bg-surface-light p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-subtext-light">최대 지출 카테고리</p>
            <p className="mt-2 text-lg font-bold text-text-light">{topCategory ? topCategory.label : "데이터 없음"}</p>
            <p className="mt-1 text-sm text-subtext-light">{topCategory ? `${formatCurrency(topCategory.amount)} · ${topCategory.count}건` : "등록된 지출이 없습니다."}</p>
          </div>
          <div className="rounded-2xl border border-border-light bg-surface-light p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-subtext-light">최근 지출 흐름</p>
            {recentEntries.length ? (
              <div className="mt-2 space-y-1 text-sm text-subtext-light">
                {recentEntries.map((entry) => (
                  <p key={entry.id}>
                    {formatDisplayDate(entry.date)} · {entry.title} · {formatCurrency(entry.amount)}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-subtext-light">해당 기간 지출이 없습니다.</p>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-text-light">카테고리별 지출</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {preparedCategoryTotals.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between rounded-2xl border border-border-light bg-surface-light px-4 py-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined flex h-10 w-10 items-center justify-center rounded-full text-xl ${item.color}`}>
                    {item.icon}
                  </span>
                  <div>
                    <p className="text-sm text-subtext-light">{item.label}</p>
                    <p className="text-lg font-semibold text-text-light">{formatCurrency(item.amount)}</p>
                  </div>
                </div>
                <div className="text-right text-xs text-subtext-light">건수 {item.count}건</div>
              </div>
            ))}
          </div>
        </section>

        {snapshot.consumableDetails.some((detail) => detail.count > 0) ? (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-text-light">소모품 지출 상세</h3>
            <div className="overflow-hidden rounded-2xl border border-border-light">
              <table className="w-full text-sm">
                <thead className="bg-background-dark text-subtext-dark">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">구분</th>
                    <th className="px-4 py-2 text-right font-semibold">금액</th>
                    <th className="px-4 py-2 text-right font-semibold">건수</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.consumableDetails.map((detail) => (
                    <tr key={detail.key} className="border-t border-border-light">
                      <td className="px-4 py-2 text-text-light">{detail.label}</td>
                      <td className="px-4 py-2 text-right font-semibold text-text-light">{formatCurrency(detail.amount)}</td>
                      <td className="px-4 py-2 text-right text-subtext-light">{detail.count}건</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-light">세부 지출 내역</h3>
            <span className="text-xs text-subtext-light">총 {snapshot.entries.length}건</span>
          </div>
          <div className="space-y-2">
            {loading ? (
              <div className="rounded-2xl border border-border-light bg-surface-light px-4 py-6 text-center text-sm text-subtext-light">
                데이터를 불러오는 중입니다...
              </div>
            ) : snapshot.entries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border-light bg-surface-light px-4 py-6 text-center text-sm text-subtext-light">
                해당 기간에 등록된 지출이 없습니다.
              </div>
            ) : (
              snapshot.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-2xl border border-border-light bg-surface-light px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-xl text-primary/70">{entry.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-text-light">{entry.title}</p>
                      <p className="text-xs text-subtext-light">
                        {formatDisplayDate(entry.date)} · {entry.categoryLabel}
                        {entry.detail ? ` · ${entry.detail}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-base font-bold text-text-light">{formatCurrency(entry.amount)}</div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
