import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { DATE_ERROR_MESSAGE, validatePastOrToday } from "../utils/dateValidation";

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
    if (distanceMode === "range" && rangeMode === "date") {
      if (!fromDate || !toDate) {
        setDistanceValue(null);
        setComparisonValue(null);
        return;
      }
      if (!validatePastOrToday(fromDate) || !validatePastOrToday(toDate) || fromDate > toDate) {
        setError(DATE_ERROR_MESSAGE);
        setDistanceValue(null);
        setComparisonValue(null);
        return;
      }
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
          apiClient.get("/odometer/range", { params: { vehicleId: vehicle.id, fromDate: from, toDate: to } }),
          apiClient.get("/odometer/range", { params: { vehicleId: vehicle.id, fromDate: prevFrom, toDate: prevTo } }),
        ]);
      } else if (rangeMode === "monthly") {
        const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
        const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
        [response, comparisonResponse] = await Promise.all([
          apiClient.get("/odometer/monthly", { params: { vehicleId: vehicle.id, year: selectedYear, month: selectedMonth } }),
          apiClient.get("/odometer/monthly", { params: { vehicleId: vehicle.id, year: prevYear, month: prevMonth } }),
        ]);
      } else {
        response = await apiClient.get("/odometer/range", { params: { vehicleId: vehicle.id, fromDate, toDate } });
      }

      const value = Number(response?.data?.distance);
      setDistanceValue(Number.isFinite(value) ? value : null);

      const comparison = Number(comparisonResponse?.data?.distance);
      setComparisonValue(Number.isFinite(comparison) ? comparison : null);
    } catch (fetchError) {
      console.error("주행거리 분석 데이터를 불러오지 못했습니다.", fetchError);
      setDistanceValue(null);
      setComparisonValue(null);
      setError("주행거리 분석 데이터를 불러오지 못했습니다.");
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
    if (comparisonValue == null || distanceValue == null) return "비교 데이터 없음";
    const diff = distanceValue - comparisonValue;
    if (diff === 0) return "직전 구간과 동일";
    return diff > 0 ? `직전 구간보다 ${diff.toLocaleString()} km 증가` : `직전 구간보다 ${Math.abs(diff).toLocaleString()} km 감소`;
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

function DrivingAnalysisCard({ title, value, caption }) {
  return (
    <div className="rounded-2xl border border-border-light bg-background-light p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-subtext-light">{title}</p>
      <p className="mt-2 text-xl font-bold text-text-light">{value}</p>
      {caption ? <p className="mt-1 text-[11px] text-subtext-light">{caption}</p> : null}
    </div>
  );
}

export default function DrivingAnalysisPanel({ vehicle }) {
  const analysis = useDrivingAnalysis(vehicle);
  const {
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
  } = analysis;

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [vehicle?.id]);

  return (
    <div className="space-y-6 px-4 py-6 pb-28">
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
                  className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90"
                >
                  조회
                </button>
              </>
            ) : null}
          </div>
        </div>

        {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DrivingAnalysisCard
            title={distanceLabel}
            value={loading ? "불러오는 중..." : formattedDistance}
            caption={distanceMode === "recent" ? "오늘을 포함한 최근 30일 기준" : undefined}
          />
          <DrivingAnalysisCard
            title="비교 결과"
            value={loading ? "불러오는 중..." : trendLabel}
            caption={comparisonValue != null ? `이전 구간: ${comparisonValue.toLocaleString()} km` : "비교할 이전 구간 데이터가 부족합니다."}
          />
        </div>
      </section>
    </div>
  );
}
