
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/client";

export function useDrivingAnalysis(vehicle, apiClient = api) {
  const [distanceMode, setDistanceMode] = useState("recent");
  const [rangeMode, setRangeMode] = useState("monthly");
  const [distanceValue, setDistanceValue] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchDistance = useCallback(async () => {
    if (!vehicle?.id) {
      setDistanceValue(null);
      return;
    }
    if (distanceMode === "range" && rangeMode === "date" && (!fromDate || !toDate)) {
      setDistanceValue(null);
      return;
    }

    setLoading(true);
    setError("");

    try {
      let response;
      if (distanceMode === "recent") {
        const now = new Date();
        const to = now.toISOString().slice(0, 10);
        const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        response = await apiClient.get("/odometer/range", {
          params: { vehicleId: vehicle.id, fromDate: from, toDate: to },
        });
      } else if (distanceMode === "range" && rangeMode === "monthly") {
        response = await apiClient.get("/odometer/monthly", {
          params: { vehicleId: vehicle.id, year: selectedYear, month: selectedMonth },
        });
      } else if (distanceMode === "range" && rangeMode === "date") {
        response = await apiClient.get("/odometer/range", {
          params: { vehicleId: vehicle.id, fromDate, toDate },
        });
      }

      const value = Number(response?.data?.distance);
      setDistanceValue(Number.isFinite(value) ? value : null);
    } catch (_err) {
      setDistanceValue(null);
      setError("주행 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [apiClient, distanceMode, fromDate, rangeMode, selectedMonth, selectedYear, toDate, vehicle?.id]);

  useEffect(() => {
    fetchDistance();
  }, [fetchDistance]);

  const formattedDistance = distanceValue != null ? `${Number(distanceValue).toLocaleString()} km` : "데이터 없음";

  const distanceLabel = useMemo(() => {
    if (distanceMode === "recent") return "최근 30일 주행거리";
    if (rangeMode === "monthly") return `${selectedYear}년 ${selectedMonth}월 주행거리`;
    return "선택한 기간 주행거리";
  }, [distanceMode, rangeMode, selectedMonth, selectedYear]);

  return {
    distanceMode,
    setDistanceMode,
    rangeMode,
    setRangeMode,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    distanceValue,
    formattedDistance,
    distanceLabel,
    loading,
    error,
    fetchDistance,
  };
}

function DrivingAnalysisView({
  distanceMode,
  setDistanceMode,
  rangeMode,
  setRangeMode,
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  fetchDistance,
  distanceLabel,
  formattedDistance,
  loading,
  error,
  variant = "panel",
}) {
  const containerClasses = variant === "card"
    ? "rounded-2xl border border-border-light bg-surface-light p-5 shadow-card"
    : "rounded-2xl border border-border-light bg-surface-light p-5 shadow-card";

  return (
    <section className={containerClasses}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-text-light">주행거리 분석</h3>
          <p className="text-sm text-subtext-light">기간별 주행 패턴을 확인하세요.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={distanceMode}
            onChange={(e) => setDistanceMode(e.target.value)}
            className="h-10 rounded-lg border border-border-light bg-background-light px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="recent">최근 30일</option>
            <option value="range">기간 지정</option>
          </select>
          {distanceMode === "range" && (
            <>
              <select
                value={rangeMode}
                onChange={(e) => setRangeMode(e.target.value)}
                className="h-10 rounded-lg border border-border-light bg-background-light px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="monthly">월별 조회</option>
                <option value="date">직접 입력</option>
              </select>
              {rangeMode === "monthly" ? (
                <>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="h-10 rounded-lg border border-border-light bg-background-light px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                      <option key={y} value={y}>
                        {y}년
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="h-10 rounded-lg border border-border-light bg-background-light px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {m}월
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="h-10 rounded-lg border border-border-light bg-background-light px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <span className="text-subtext-light">~</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="h-10 rounded-lg border border-border-light bg-background-light px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </>
              )}
              <button
                type="button"
                onClick={fetchDistance}
                className="flex h-10 items-center gap-1 rounded-lg bg-primary px-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
                disabled={loading}
              >
                <span className="material-symbols-outlined text-base">insights</span>
                조회
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
        <p className="text-sm text-subtext-light">{distanceLabel}</p>
        <p className="mt-1 text-2xl font-bold text-text-light">{loading ? "계산 중..." : formattedDistance}</p>
        {error && <p className="mt-2 text-sm font-semibold text-red-500">{error}</p>}
      </div>
    </section>
  );
}

export function DrivingAnalysisCard({ analysis }) {
  return <DrivingAnalysisView {...analysis} variant="card" />;
}

export default function DrivingAnalysisPanel({ vehicle, apiClient = api, onBack, hideLocalBack }) {
  const analysis = useDrivingAnalysis(vehicle, apiClient);

  return (
    <div className="flex min-h-screen flex-col bg-background-light text-text-light">
      <div className="space-y-6 px-4 py-6 pb-24">
        {!hideLocalBack && (
          <button
            type="button"
            aria-label="이전으로"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border-light bg-surface-light text-primary shadow-sm transition hover:text-primary/80"
            onClick={() => (typeof onBack === "function" ? onBack() : window.history.back())}
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
        )}

        <section className="space-y-3">
          <h1 className="text-xl font-bold text-text-light">주행거리 분석</h1>
          <p className="text-sm text-subtext-light">
            차량의 주행 패턴을 기간별로 분석하고 이동 거리를 비교해 보세요.
          </p>
        </section>

        <DrivingAnalysisView {...analysis} variant="panel" />
      </div>
    </div>
  );
}
