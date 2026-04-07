import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/client";

function formatDistance(value) {
  return value != null ? `${Number(value).toLocaleString()} km` : "데이터 없음";
}

function monthLabel(year, month) {
  return `${year}년 ${month}월`;
}

export function useDrivingAnalysis(vehicle, apiClient = api) {
  const [distanceMode, setDistanceMode] = useState("recent");
  const [rangeMode, setRangeMode] = useState("monthly");
  const [distanceValue, setDistanceValue] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [comparisonValue, setComparisonValue] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchDistance = useCallback(async () => {
    if (!vehicle?.id) {
      setDistanceValue(null);
      setComparisonValue(null);
      return;
    }
    if (distanceMode === "range" && rangeMode === "date" && (!fromDate || !toDate)) {
      setDistanceValue(null);
      setComparisonValue(null);
      return;
    }

    setLoading(true);
    setError("");

    try {
      let response;
      let comparisonResponse = null;

      if (distanceMode === "recent") {
        const now = new Date();
        const to = now.toISOString().slice(0, 10);
        const from = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const prevTo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const prevFrom = new Date(now.getTime() - 59 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        [response, comparisonResponse] = await Promise.all([
          apiClient.get("/odometer/range", {
            params: { vehicleId: vehicle.id, fromDate: from, toDate: to },
          }),
          apiClient.get("/odometer/range", {
            params: { vehicleId: vehicle.id, fromDate: prevFrom, toDate: prevTo },
          }),
        ]);
      } else if (rangeMode === "monthly") {
        const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
        const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
        [response, comparisonResponse] = await Promise.all([
          apiClient.get("/odometer/monthly", {
            params: { vehicleId: vehicle.id, year: selectedYear, month: selectedMonth },
          }),
          apiClient.get("/odometer/monthly", {
            params: { vehicleId: vehicle.id, year: prevYear, month: prevMonth },
          }),
        ]);
      } else {
        response = await apiClient.get("/odometer/range", {
          params: { vehicleId: vehicle.id, fromDate, toDate },
        });
      }

      const value = Number(response?.data?.distance);
      setDistanceValue(Number.isFinite(value) ? value : null);

      const comparison = Number(comparisonResponse?.data?.distance);
      setComparisonValue(Number.isFinite(comparison) ? comparison : null);
    } catch {
      setDistanceValue(null);
      setComparisonValue(null);
      setError("주행 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [apiClient, distanceMode, fromDate, rangeMode, selectedMonth, selectedYear, toDate, vehicle?.id]);

  useEffect(() => {
    fetchDistance();
  }, [fetchDistance]);

  const formattedDistance = formatDistance(distanceValue);
  const distanceLabel = useMemo(() => {
    if (distanceMode === "recent") return "최근 30일 주행거리";
    if (rangeMode === "monthly") return `${monthLabel(selectedYear, selectedMonth)} 주행거리`;
    return "선택 기간 주행거리";
  }, [distanceMode, rangeMode, selectedMonth, selectedYear]);

  const trendLabel = useMemo(() => {
    if (comparisonValue == null || distanceValue == null) return "비교 데이터 부족";
    const diff = distanceValue - comparisonValue;
    if (diff === 0) return "직전 구간과 동일";
    return diff > 0
      ? `직전 구간보다 ${diff.toLocaleString()}km 증가`
      : `직전 구간보다 ${Math.abs(diff).toLocaleString()}km 감소`;
  }, [comparisonValue, distanceValue]);

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
    comparisonValue,
    formattedDistance,
    distanceLabel,
    trendLabel,
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
  trendLabel,
  comparisonValue,
  loading,
  error,
}) {
  return (
    <section className="rounded-2xl border border-border-light bg-surface-light p-5 shadow-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-text-light">주행거리 분석</h3>
          <p className="text-sm text-subtext-light">기간별 이동 거리와 직전 구간 비교 결과를 확인하세요.</p>
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
          {distanceMode === "range" ? (
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
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                      <option key={year} value={year}>
                        {year}년
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="h-10 rounded-lg border border-border-light bg-background-light px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <option key={month} value={month}>
                        {month}월
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
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 sm:col-span-2">
          <p className="text-sm text-subtext-light">{distanceLabel}</p>
          <p className="mt-1 text-2xl font-bold text-text-light">{loading ? "계산 중..." : formattedDistance}</p>
          <p className="mt-2 text-sm text-primary">{trendLabel}</p>
          {error ? <p className="mt-2 text-sm font-semibold text-red-500">{error}</p> : null}
        </div>
        <div className="rounded-xl border border-border-light bg-background-light p-4">
          <p className="text-sm text-subtext-light">직전 구간</p>
          <p className="mt-1 text-xl font-bold text-text-light">{formatDistance(comparisonValue)}</p>
          <p className="mt-2 text-sm text-subtext-light">최근 30일은 오늘 포함 기준으로 바로 이전 30일과 비교합니다.</p>
        </div>
      </div>
    </section>
  );
}

export function DrivingAnalysisCard({ analysis }) {
  return <DrivingAnalysisView {...analysis} />;
}

export default function DrivingAnalysisPanel({ vehicle }) {
  const analysis = useDrivingAnalysis(vehicle, api);

  return (
    <div className="flex min-h-screen flex-col bg-background-light text-text-light">
      <div className="space-y-6 px-4 py-6 pb-24">
        <section className="space-y-3">
          <h1 className="text-xl font-bold text-text-light">주행거리 분석</h1>
          <p className="text-sm text-subtext-light">차량의 이동 거리를 기간별로 비교하고 최근 흐름을 확인하세요.</p>
        </section>
        <DrivingAnalysisView {...analysis} />
      </div>
    </div>
  );
}
