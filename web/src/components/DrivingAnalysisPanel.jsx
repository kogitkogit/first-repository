import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import ConfirmDialog from "./ui/ConfirmDialog";
import { useToast } from "./ui/ToastProvider";
import { DATE_ERROR_MESSAGE, validatePastOrToday } from "../utils/dateValidation";

function formatDistance(value) {
  return value != null ? `${Number(value).toLocaleString()} km` : "데이터 없음";
}

function formatDateLabel(value) {
  if (!value) return "날짜 정보 없음";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${year}.${month}.${day}.`;
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
  const [overallRange, setOverallRange] = useState(null);
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
      } else if (distanceMode === "overall") {
        response = await apiClient.get("/odometer/overall", { params: { vehicleId: vehicle.id } });
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
      setOverallRange(
        distanceMode === "overall"
          ? {
              startDate: response?.data?.start_date || null,
              endDate: response?.data?.end_date || null,
              count: response?.data?.count || 0,
            }
          : null,
      );

      const comparison = Number(comparisonResponse?.data?.distance);
      setComparisonValue(Number.isFinite(comparison) ? comparison : null);
    } catch (fetchError) {
      console.error("주행거리 분석 데이터를 불러오지 못했습니다.", fetchError);
      setDistanceValue(null);
      setComparisonValue(null);
      setOverallRange(null);
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
    if (distanceMode === "overall") return "전체 기간 주행거리";
    if (rangeMode === "monthly") return `${monthLabel(selectedYear, selectedMonth)} 주행거리`;
    return "선택 기간 주행거리";
  }, [distanceMode, rangeMode, selectedMonth, selectedYear]);

  const trendLabel = useMemo(() => {
    if (distanceMode === "overall") return "전체 기록 기준";
    if (comparisonValue == null || distanceValue == null) return "비교 데이터 없음";
    const diff = distanceValue - comparisonValue;
    if (diff === 0) return "직전 구간과 동일";
    return diff > 0
      ? `직전 구간보다 ${diff.toLocaleString()} km 증가`
      : `직전 구간보다 ${Math.abs(diff).toLocaleString()} km 감소`;
  }, [comparisonValue, distanceMode, distanceValue]);

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
    overallRange,
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

export default function DrivingAnalysisPanel({ vehicle, onVehicleRefresh }) {
  const { showToast } = useToast();
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [editKm, setEditKm] = useState("");
  const [deleteLog, setDeleteLog] = useState(null);

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
    overallRange,
    loading,
    error,
  } = analysis;

  const loadHistory = useCallback(async () => {
    if (!vehicle?.id) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const { data } = await api.get("/odometer/history", { params: { vehicleId: vehicle.id } });
      setHistory(Array.isArray(data?.items) ? data.items : []);
    } catch (loadError) {
      console.error("주행거리 기록을 불러오지 못했습니다.", loadError);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [vehicle?.id]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [vehicle?.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const refreshAfterChange = async (currentOdo) => {
    await loadHistory();
    fetchDistance();
    if (onVehicleRefresh) {
      await onVehicleRefresh(vehicle.id, currentOdo);
    }
  };

  const startEdit = (log) => {
    setEditingLog(log);
    setEditDate(log.date || "");
    setEditKm(log.odo_km != null ? String(log.odo_km) : "");
  };

  const cancelEdit = () => {
    setEditingLog(null);
    setEditDate("");
    setEditKm("");
  };

  const saveEdit = async () => {
    if (!editingLog || !editDate || !editKm) return;
    if (!validatePastOrToday(editDate)) {
      showToast({ tone: "warning", message: DATE_ERROR_MESSAGE, placement: "center", duration: 1800 });
      return;
    }
    try {
      const { data } = await api.put(`/odometer/${editingLog.id}`, {
        date: editDate,
        odo_km: Number(editKm),
      });
      cancelEdit();
      await refreshAfterChange(data?.current_odo_km);
      showToast({ tone: "success", message: "저장되었습니다.", placement: "center", duration: 1600 });
    } catch (saveError) {
      const message = saveError?.response?.data?.detail || "주행거리 기록 수정에 실패했습니다.";
      showToast({ tone: "error", message, placement: "center", duration: 1800 });
    }
  };

  const confirmDelete = async () => {
    if (!deleteLog) return;
    try {
      const { data } = await api.delete(`/odometer/${deleteLog.id}`);
      if (editingLog?.id === deleteLog.id) {
        cancelEdit();
      }
      setDeleteLog(null);
      await refreshAfterChange(data?.current_odo_km);
      showToast({ tone: "success", message: "삭제되었습니다.", placement: "center", duration: 1600 });
    } catch (deleteError) {
      showToast({ tone: "error", message: "주행거리 기록 삭제에 실패했습니다.", placement: "center", duration: 1800 });
    }
  };

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
              <option value="overall">전체 기간</option>
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
            caption={
              distanceMode === "recent"
                ? "오늘을 포함한 최근 30일 기준"
                : distanceMode === "overall" && overallRange?.count
                ? `${formatDateLabel(overallRange.startDate)} ~ ${formatDateLabel(overallRange.endDate)} · 총 ${overallRange.count}건`
                : undefined
            }
          />
          <DrivingAnalysisCard
            title="비교 결과"
            value={loading ? "불러오는 중..." : trendLabel}
            caption={
              distanceMode === "overall"
                ? "전체 기간은 직전 구간과 비교하지 않습니다."
                : comparisonValue != null
                ? `이전 구간: ${comparisonValue.toLocaleString()} km`
                : "비교할 이전 구간 데이터가 부족합니다."
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border-light bg-surface-light p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-text-light">주행거리 기록</h3>
            <p className="text-sm text-subtext-light">입력한 주행거리 이력을 확인하고 잘못된 기록을 수정하거나 삭제하세요.</p>
          </div>
          <button
            type="button"
            onClick={loadHistory}
            className="inline-flex h-9 items-center gap-1 rounded-full border border-border-light bg-background-light px-3 text-xs font-semibold text-subtext-light transition hover:text-primary"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
          </button>
        </div>

        {historyLoading ? (
          <div className="rounded-xl border border-border-light bg-background-light/70 px-4 py-5 text-center text-sm text-subtext-light">
            주행거리 기록을 불러오는 중...
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-xl border border-border-light bg-background-light/70 px-4 py-5 text-center text-sm text-subtext-light">
            아직 저장된 주행거리 기록이 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((log) => (
              <div key={log.id} className="rounded-2xl border border-border-light bg-background-light p-4 shadow-sm">
                {editingLog?.id === log.id ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm">
                      <span className="font-medium text-text-light">기록 날짜</span>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="h-11 rounded-lg border border-border-light px-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                      <span className="font-medium text-text-light">주행거리 (km)</span>
                      <input
                        type="number"
                        value={editKm}
                        onChange={(e) => setEditKm(e.target.value)}
                        className="h-11 rounded-lg border border-border-light px-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </label>
                    <div className="flex gap-2 sm:col-span-2">
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="flex h-10 flex-1 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-white transition hover:bg-primary/90"
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="flex h-10 flex-1 items-center justify-center rounded-lg border border-border-light text-sm font-semibold text-subtext-light transition hover:text-primary"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-text-light">{Number(log.odo_km).toLocaleString()} km</p>
                      <p className="text-xs text-subtext-light">{formatDateLabel(log.date)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(log)}
                        className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/15"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteLog(log)}
                        className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(deleteLog)}
        title="주행거리 기록을 삭제할까요?"
        description="삭제한 주행거리 기록은 복구하기 어렵습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        onCancel={() => setDeleteLog(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
