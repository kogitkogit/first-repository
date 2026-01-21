import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

const CATEGORY = "오일";

const DEFAULTS = {
  "엔진오일": { cycleKm: 5000,  cycleMonths: 6,  defaultMode: "distance" },
  "미션오일":     { cycleKm: 40000, cycleMonths: 24, defaultMode: "distance" },
  "브레이크액":   { cycleKm: 40000,     cycleMonths: 24, defaultMode: "distance" },
  "부동액": { cycleKm: 40000, cycleMonths: 24, defaultMode: "distance" },
};

const BASE_ITEMS = Object.keys(DEFAULTS).map((kind) => ({ key: kind, kind }));

const toIntOrNull = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

const isYmd = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

const formatNumber = (value) => {
  if (value === undefined || value === null) return "-";
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return num.toLocaleString();
};

const formatYmd = (value) => {
  if (!isYmd(value)) return "-";
  return value.replace(/-/g, ". ");
};

const computeDistanceStatus = ({ currentMileage, lastOdo, cycleKm }) => {
  if (cycleKm == null) {
    return { tone: "muted", message: "주행 주기가 설정되지 않았습니다." };
  }
  if (currentMileage == null) {
    return { tone: "muted", message: "현재 주행거리를 불러올 수 없습니다." };
  }
  if (lastOdo == null) {
    return { tone: "muted", message: "마지막 교체 주행거리가 없습니다." };
  }

  const used = Number(currentMileage) - Number(lastOdo);
  const remain = Number(cycleKm) - used;
  if (!Number.isFinite(used) || !Number.isFinite(remain)) {
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

const toneTextClass = (tone) => {
  switch (tone) {
    case "danger":
      return "text-red-600";
    case "warn":
      return "text-amber-600";
    case "ok":
      return "text-emerald-600";
    default:
      return "text-subtext-light";
  }
};

const toneProgressClass = (tone) => {
  switch (tone) {
    case "danger":
      return "bg-red-500";
    case "warn":
      return "bg-amber-400";
    case "ok":
      return "bg-emerald-500";
    default:
      return "bg-primary/40";
  }
};

function ItemCard({ item, state, onOpenDetail, onDelete, currentMileage, alertsEnabled = false, dueMessage, lastHistoryValue, lastHistoryDate }) {
  const mode = state.mode || "distance";
  const [confirmOpen, setConfirmOpen] = useState(false);

  const statusData = useMemo(() => {
    const parseOdoFromHistory = (v) => {
      if (v == null) return null;
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string") {
        const m = v.match(/\d+/);
        return m ? Number(m[0]) : null;
      }
      return null;
    };

    const parseDateFromHistory = (v) => {
      if (v == null) return null;
      if (typeof v === "string" && isYmd(v)) return v;
      const d = new Date(v);
      return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : null;
    };

    if (mode === "distance") {
      const historyOdo = parseOdoFromHistory(lastHistoryValue);
      const baseOdo = historyOdo;
      const cycleValue = Number(state.cycleKm || 0);
      if (cycleValue <= 0) {
        return { tone: "muted", message: "주행 주기가 설정되지 않았습니다.", showProgress: false };
      }
      if (currentMileage == null) {
        return { tone: "muted", message: "현재 주행거리를 불러올 수 없습니다.", showProgress: false };
      }
      if (baseOdo == null) {
        return { tone: "muted", message: "마지막 교체 주행거리가 없습니다.", showProgress: false };
      }
      const used = Math.max(0, Number(currentMileage) - Number(baseOdo));
      const remain = cycleValue - used;
      if (!Number.isFinite(remain)) {
        return { tone: "muted", message: "교체 정보를 입력해주세요.", showProgress: false };
      }
      const status = computeDistanceStatus({ currentMileage, lastOdo: baseOdo, cycleKm: cycleValue });
      const tone = status.tone || (remain <= 0 ? "danger" : remain <= Math.max(500, cycleValue * 0.2) ? "warn" : "ok");
      const message = status.message || (remain <= 0 ? "즉시 교체가 필요합니다." : `남은 주행거리: ${Math.max(remain, 0)} km`);
      const percent = cycleValue > 0 ? Math.min(100, Math.max(0, (used / cycleValue) * 100)) : 0;
      return {
        tone,
        message,
        used,
        cycleValue,
        percent,
        showProgress: true,
        showAlert: alertsEnabled && dueMessage && tone === "danger",
      };
    }

    if (mode === "time") {
      const baseDate = parseDateFromHistory(lastHistoryValue);
      if (baseDate && state.cycleMonths) {
        const last = new Date(baseDate);
        const now = new Date();
        const diffMonths = (now.getFullYear() - last.getFullYear()) * 12 + (now.getMonth() - last.getMonth());
        const remain = Number(state.cycleMonths || 0) - diffMonths;
        if (!Number.isFinite(remain)) {
          return { tone: "muted", message: "교체 정보를 입력해주세요.", showProgress: false };
        }
        const isDue = remain <= 0;
        return {
          tone: isDue ? "danger" : "ok",
          message: isDue ? "교체 시기 도래!" : `남은 기간: ${Math.max(remain, 0)} 개월`,
          showProgress: false,
          showAlert: alertsEnabled && dueMessage && isDue,
        };
      }
    }

    return { tone: "muted", message: "교체 정보를 입력해주세요.", showProgress: false };
  }, [mode, currentMileage, state.cycleKm, state.cycleMonths, alertsEnabled, dueMessage, lastHistoryValue]);

    return (
      <div className="relative w-full rounded-2xl border border-border-light bg-surface-light p-4 text-left shadow-card">
        <button
          type="button"
          onClick={() => onOpenDetail?.(item.key)}
          className="w-full text-left transition hover:text-text-light"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-text-light">{state.kind}</h3>
              <p className={`text-xs font-semibold ${toneTextClass(statusData.tone)}`}>{statusData.message}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full bg-border-light/70 px-2 py-0.5 text-[11px] font-semibold ${toneTextClass(statusData.tone)}`}>
                {statusData.tone === "danger" ? "교체 필요" : statusData.tone === "warn" ? "교체 임박" : statusData.tone === "ok" ? "정상" : "정보 없음"}
              </span>
              <button
                type="button"
                aria-label="삭제"
                onClick={(event) => {
                  event.stopPropagation();
                  setConfirmOpen(true);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-subtext-light transition hover:text-red-600"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-subtext-light">
            최종 교체일: {formatYmd(lastHistoryDate || (isYmd(lastHistoryValue) ? lastHistoryValue : null))}
          </p>
          {statusData.showAlert ? (
            <div className="mt-2 rounded-md bg-yellow-100 px-3 py-2 text-[11px] font-semibold text-yellow-800">{dueMessage}</div>
          ) : null}
          {statusData.showProgress ? (
            <div className="mt-2 space-y-1">
              <div className="h-2 w-full rounded-full bg-border-light/50">
                <div
                  className={`h-2 rounded-full ${toneProgressClass(statusData.tone)}`}
                  style={{ width: `${statusData.percent}%` }}
                />
              </div>
              <p className="text-right text-[11px] text-subtext-light">
                {formatNumber(statusData.used)} / {formatNumber(statusData.cycleValue)} km
              </p>
            </div>
          ) : null}
        </button>
        {confirmOpen ? (
          <div
            className="absolute right-3 top-12 z-10 w-40 rounded-xl border border-border-light bg-white px-3 py-2 text-xs shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="font-semibold text-text-light">삭제하시겠습니까?</p>
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-full px-2 py-1 text-[11px] font-semibold text-subtext-light hover:text-text-light"
              >
                아니오
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  onDelete?.(item.key, item.id);
                }}
                className="rounded-full bg-red-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-600"
              >
                예
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

function DetailModal({ open, item, onClose, onChange, onSaveHistory, onSaveConfig, onOpenHistory }) {
  if (!open || !item) return null;
  const flash = item.flash;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-4 shadow-2xl max-h-[92vh] overflow-y-auto sm:p-6 sm:max-h-[85vh]">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-text-light sm:text-lg">오일 상세 정보</h3>
          <button onClick={onClose} className="text-subtext-light transition hover:text-text-light">
            <span className="material-symbols-outlined text-xl sm:text-2xl">close</span>
          </button>
        </div>

        <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs font-semibold text-subtext-light">항목 이름</span>
              <input
                value={item.kind}
                onChange={(e) => onChange(item.key, "kind", e.target.value)}
                className="h-10 w-full rounded-xl border border-border-light bg-background-light px-3 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:h-11"
              />
            </label>
            <div className="col-span-2 flex items-end gap-2">
              <label className="flex w-1/3 flex-col gap-2 text-sm">
                <span className="text-xs font-semibold text-subtext-light">관리 방식</span>
                <select
                  value={item.mode}
                  onChange={(e) => onChange(item.key, "mode", e.target.value)}
                  className="h-10 w-full rounded-xl border border-border-light bg-background-light px-3 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:h-11"
                >
                  <option value="distance">주행거리 기준</option>
                  <option value="time">기간 기준</option>
                </select>
              </label>
                <label className="flex w-1/3 flex-col gap-2 text-sm">
                  <span className="text-xs font-semibold text-subtext-light">교체 주기</span>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="주기"
                      value={item.mode === "distance" ? item.cycleKm || "" : item.cycleMonths || ""}
                      onChange={(e) =>
                        onChange(item.key, item.mode === "distance" ? "cycleKm" : "cycleMonths", e.target.value)
                      }
                      className="h-10 w-full rounded-xl border border-border-light bg-background-light px-3 pr-9 text-right text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:h-11"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-subtext-light">
                      {item.mode === "distance" ? "km" : "개월"}
                    </span>
                  </div>
                </label>
              <button
                type="button"
                onClick={() => onSaveConfig?.(item.key)}
                className="inline-flex h-10 w-[28%] items-center justify-center rounded-full border border-border-light bg-primary/10 px-2 text-xs font-semibold text-primary transition hover:bg-primary/20 sm:h-11"
              >
                관리 방식 저장
              </button>
            </div>
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs font-semibold text-subtext-light">마지막 교체 주행거리</span>
              <input
                type="number"
                placeholder="예: 125,000"
                value={item.lastOdo || ""}
                onChange={(e) => onChange(item.key, "lastOdo", e.target.value)}
                className="h-10 w-full rounded-xl border border-border-light bg-background-light px-3 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:h-11"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs font-semibold text-subtext-light">마지막 교체일</span>
              <input
                type="date"
                value={item.lastDate || ""}
                onChange={(e) => onChange(item.key, "lastDate", e.target.value)}
                className="h-10 w-full rounded-xl border border-border-light bg-background-light px-3 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:h-11"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs font-semibold text-subtext-light">비용 (원)</span>
              <input
                type="number"
                placeholder="예: 45,000"
                value={item.cost || ""}
                onChange={(e) => onChange(item.key, "cost", e.target.value)}
                className="h-10 w-full rounded-xl border border-border-light bg-background-light px-3 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:h-11"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs font-semibold text-subtext-light">메모</span>
              <input
                type="text"
                placeholder="메모를 남겨주세요"
                value={item.memo || ""}
                onChange={(e) => onChange(item.key, "memo", e.target.value)}
                className="h-10 w-full rounded-xl border border-border-light bg-background-light px-3 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:h-11"
              />
            </label>
          </div>


            <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenHistory?.(item.key)}
              className="flex items-center gap-2 rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600"
            >
              <span className="material-symbols-outlined text-base">history</span>
              이력 보기
            </button>
            <button
              type="button"
              onClick={() => onSaveHistory?.(item.key)}
              className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              <span className="material-symbols-outlined text-base">save</span>
              이력 기록
            </button>
          </div>

          {(flash === "history-saved" || flash === "saved") && (
            <div className="text-sm font-semibold text-emerald-600">이력 기록이 저장되었습니다.</div>
          )}
          {flash === "config-saved" && (
            <div className="text-sm font-semibold text-emerald-600">관리 방식이 저장되었습니다.</div>
          )}
          {flash && flash.startsWith("err:") && (
            <div className="text-sm font-semibold text-red-600">{flash.replace("err:", "")}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryModal({ open, onClose, title, rows, onDeleteSelected, onUpdateRow, scope, sort, onChangeSort }) {
  const [selected, setSelected] = useState({});
  if (!open) return null;

  const toggle = (id) => setSelected((p) => ({ ...p, [id]: !p[id] }));
  const selectedIds = Object.keys(selected).filter((k) => selected[k]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-[min(980px,92vw)] p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold whitespace-nowrap">{title}</h3>
            {scope === "all" ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600 whitespace-nowrap">정렬:</span>
                <select value={sort} onChange={(e) => onChangeSort?.(e.target.value)} className="border rounded px-2 py-1">
                  <option value="date">날짜</option>
                  <option value="odo">주행거리</option>
                  <option value="id">등록순</option>
                </select>
              </div>
            ) : null}
          </div>
          <button className="text-gray-500 whitespace-nowrap" onClick={onClose}>닫기 ✕</button>
        </div>

        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-sm border table-auto">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 border w-10"></th>
                <th className="p-2 border whitespace-nowrap">항목</th>
                <th className="p-2 border whitespace-nowrap">교체일</th>
                <th className="p-2 border whitespace-nowrap">교체거리</th>
                <th className="p-2 border whitespace-nowrap">비용(원)</th>
                <th className="p-2 border whitespace-nowrap">메모</th>
                <th className="p-2 border w-24 whitespace-nowrap">수정</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="p-3 text-center text-gray-500" colSpan={6}>저장된 이력이 없습니다.</td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td className="p-2 border text-center">
                      <input type="checkbox" checked={!!selected[r.id]} onChange={() => toggle(r.id)} />
                    </td>
                    <td className="p-2 border whitespace-nowrap">{r.kind || r.label}</td>
                    <td className="p-2 border whitespace-nowrap">{r.date ? r.date.slice(0, 10) : "-"}</td>
                    <td className="p-2 border whitespace-nowrap">{r.odo_km ? `${r.odo_km.toLocaleString()} km` : "-"}</td>
                    <td className="p-2 border whitespace-nowrap text-right">{r.cost ?? ""}</td>
                    <td className="p-2 border whitespace-nowrap max-w-[320px] truncate" title={r.memo ?? ""}>
                      {r.memo ?? ""}
                    </td>
                    <td className="p-2 border text-center whitespace-nowrap">
                      <button onClick={() => onUpdateRow(r)} className="px-2 py-1 text-blue-600 hover:underline">
                        수정
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={() => onDeleteSelected(selectedIds)}
            className="bg-red-500 text-white rounded px-3 py-1 hover:bg-red-600 disabled:opacity-50"
            disabled={selectedIds.length === 0}
          >
            선택 삭제
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OilPanel({ currentMileage, vehicleId, apiClient, onBack, hideLocalBack, userId }) {
  const location = useLocation();
  const [items, setItems] = useState(() =>
    BASE_ITEMS.map((it) => ({
      key: it.key,
      kind: it.kind,
      editingName: false,
      mode: DEFAULTS[it.kind]?.defaultMode || "distance",
      lastOdo: "",
      lastDate: "",
      cycleKm: DEFAULTS[it.kind]?.cycleKm ?? "",
      cycleMonths: DEFAULTS[it.kind]?.cycleMonths ?? "",
      cost: "",
      memo: "",
      history: [],
      flash: null,
    }))
  );

  const [historyModal, setHistoryModal] = useState({
    open: false,
    title: "",
    rows: [],
    scope: "single",
    itemKey: null,
  });
  const [detailModal, setDetailModal] = useState({ open: false, itemKey: null });
  const activeItem = useMemo(() => items.find((it) => it.key === detailModal.itemKey), [items, detailModal.itemKey]);
  const [alertsEnabled, setAlertsEnabled] = useState(false);

  useEffect(() => {
    if (location.pathname !== "/oil") return;
    setItems((prev) =>
      prev.map((row) =>
        row.lastOdo || row.lastDate || row.cost || row.memo
          ? { ...row, lastOdo: "", lastDate: "", cost: "", memo: "" }
          : row
      )
    );
  }, [location.pathname]);

  const [allSort, setAllSort] = useState("date"); // date | odo | id

  const apiPrefix = apiClient ? "" : "/api";

  const request = async (method, url, body) => {
    if (apiClient && typeof apiClient[method] === "function") {
      if (method === "get" || method === "delete") {
        const res = await apiClient[method](url);
        return res?.data;
      }
      const res = await apiClient[method](url, body);
      return res?.data;
    } else {
      const res = await fetch(url, {
        method: method.toUpperCase(),
        headers: { "Content-Type": "application/json" },
        body: method === "get" ? undefined : JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || err?.message || `HTTP ${res.status}`);
      }
      return await res.json().catch(() => ({}));
    }
  };

  useEffect(() => {
    try {
      const fallbackUserId = typeof window !== "undefined" ? window.__USER_ID__ || localStorage.getItem("user_id") : null;
      const uid = userId ?? fallbackUserId;
      if (!uid || !vehicleId) return;
      const url = `${apiPrefix || ""}/notifications?userId=${uid}&vehicleId=${vehicleId}`;
      const run = async () => {
        const res = await request("get", url);
        const data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        const target = Array.isArray(data) ? data.find((n) => n.type === "oil") : null;
        setAlertsEnabled(!!target?.enabled);
      };
      run();
    } catch (e) {
      console.error("알림 설정 불러오기 실패:", e);
    }
  }, [vehicleId, userId]);

  // 서버 항목 로드 (DB id 반영)
  useEffect(() => {
    const loadItems = async () => {
      try {
        const data = await request(
          "get",
          `${apiPrefix}/consumables/items?vehicleId=${vehicleId}&category=${encodeURIComponent(CATEGORY)}`
        );
        setItems(
          data.map((r) => ({
            id: r.id,
            key: r.kind || r.label,
            kind: r.kind || r.label,
            mode: r.mode || "distance",
            lastOdo: "",
            lastDate: "",
            cycleKm: r.cycleKm ?? "",
            cycleMonths: r.cycleMonths ?? "",
            cost: "",
            memo: "",
            history: [],
            flash: null,
              }))
        );
      } catch (e) {
        console.error("항목 불러오기 실패:", e);
      }
    };
    if (vehicleId) loadItems();
  }, [vehicleId, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = (key, field, value) => {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, [field]: value } : it)));
  };

  const removeItem = async (key, id) => {
    if (!id) {
      alert("서버 id가 없어 로컬에서만 삭제됩니다.");
      setItems((prev) => prev.filter((it) => it.key !== key));
      return;
    }
    try {
      await request("delete", `${apiPrefix}/consumables/items/${id}`);
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (e) {
      console.error("삭제 실패:", e);
      alert("삭제에 실패했습니다.");
    }
  };

  const saveHistory = async (key) => {
    const it = items.find((i) => i.key === key);
    if (!it) return;

    if (!vehicleId) {
      setItems((prev) =>
        prev.map((row) => (row.key === key ? { ...row, flash: "err:차량이 선택되지 않았습니다." } : row))
      );
      return;
    }

    const odo = toIntOrNull(it.lastOdo ?? currentMileage);
    const dateYmd = isYmd(it.lastDate) ? it.lastDate : null;

    if (odo === null || !dateYmd) {
      setItems((prev) =>
        prev.map((row) =>
          row.key === key
            ? { ...row, flash: "err:마지막 교체 주행거리와 교체일을 모두 입력해주세요." }
            : row
        )
      );
      return;
    }

    const payload = {
      vehicle_id: vehicleId,
      category: CATEGORY,
      kind: it.kind,
      date: dateYmd,
      odo_km: odo,
      cycle_km: toIntOrNull(it.cycleKm),
      cycle_months: toIntOrNull(it.cycleMonths),
      cost: toIntOrNull(it.cost),
      memo: it.memo || null,
    };

    try {
      await request("post", `${apiPrefix}/consumables/add`, payload);
      setItems((prev) =>
        prev.map((row) =>
          row.key === key
            ? { ...row, flash: "history-saved", lastOdo: "", lastDate: "", cost: "", memo: "" }
            : row
        )
      );
      setMaxOdoByKind((prev) => ({
        ...prev,
        [it.kind]: Math.max(prev[it.kind] ?? 0, odo),
      }));
      setMaxDateByKind((prev) => ({
        ...prev,
        [it.kind]: dateYmd,
      }));
      setTimeout(() => {
        setItems((prev) => prev.map((row) => (row.key === key ? { ...row, flash: null } : row)));
      }, 1600);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("consumables:changed"));
      }
    } catch (e) {
      const msg = e?.message ? String(e.message) : "저장 실패";
      setItems((prev) =>
        prev.map((row) => (row.key === key ? { ...row, flash: "err:" + msg } : row))
      );
    }
  };

  const saveConfig = async (key) => {
    const it = items.find((i) => i.key === key);
    if (!it) return;

    if (!vehicleId || !it.id) {
      setItems((prev) =>
        prev.map((row) =>
          row.key === key ? { ...row, flash: "err:항목 ID가 없어 설정을 저장할 수 없습니다." } : row
        )
      );
      return;
    }

    const body = {
      kind: it.kind,
      category: CATEGORY,
      mode: it.mode,
      cycle_km: toIntOrNull(it.cycleKm),
      cycle_months: toIntOrNull(it.cycleMonths),
      vehicle_id: vehicleId,
    };

    try {
      await request("put", `${apiPrefix}/consumables/items/${it.id}`, body);
      setItems((prev) =>
        prev.map((row) => (row.key === key ? { ...row, flash: "config-saved" } : row))
      );
      setTimeout(() => {
        setItems((prev) => prev.map((row) => (row.key === key ? { ...row, flash: null } : row)));
      }, 1600);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("consumables:changed"));
      }
    } catch (e) {
      const msg = e?.message ? String(e.message) : "설정 저장에 실패했습니다.";
      setItems((prev) =>
        prev.map((row) => (row.key === key ? { ...row, flash: "err:" + msg } : row))
      );
    }
  };
  const fetchItemHistory = async (key) => {
    const it = items.find((i) => i.key === key);
    if (!it || !vehicleId) return [];
    const qs = new URLSearchParams({
      vehicleId: String(vehicleId),
      category: CATEGORY,
      kind: it.kind,
      sort: "date",
      order: "desc",
    }).toString();
    const data = await request("get", `${apiPrefix}/consumables/search?${qs}`);
    return Array.isArray(data) ? data : [];
  };

  const openHistory = async (key) => {
    const rows = await fetchItemHistory(key);
    const it = items.find((i) => i.key === key);
    setHistoryModal({
      open: true,
      title: `${it?.kind || ""} 이력`,
      rows,
      scope: "single",
      itemKey: key,
    });
  };

  const fetchAllHistory = async () => {
    if (!vehicleId) return [];
    const sortParam = allSort === "odo" ? "odo" : allSort === "id" ? "id" : "date";
    const qs = new URLSearchParams({
      vehicleId: String(vehicleId),
      category: CATEGORY,
      sort: sortParam,
      order: "desc",
    }).toString();
    const data = await request("get", `${apiPrefix}/consumables/search?${qs}`);
    return Array.isArray(data) ? data : [];
  };

  // 계산용: 전체 이력 로우를 가져와 kind별 최대 odo와 최신 날짜를 미리 맵으로 준비
  const [maxOdoByKind, setMaxOdoByKind] = useState({});
  const [maxDateByKind, setMaxDateByKind] = useState({});

  const recomputeUsageStats = async (options = {}) => {
    const shouldReset = Boolean(options.resetInputs);
    if (!vehicleId) {
      setMaxOdoByKind({});
      setMaxDateByKind({});
      if (shouldReset) {
        setItems((prev) =>
          prev.map((row) =>
            row.lastOdo || row.lastDate || row.cost || row.memo
              ? { ...row, lastOdo: "", lastDate: "", cost: "", memo: "" }
              : row
          )
        );
      }
      return;
    }
    try {
      const qs = new URLSearchParams({
        vehicleId: String(vehicleId),
        category: CATEGORY,
        sort: "id",
        order: "desc",
      }).toString();
      const rows = await request("get", `${apiPrefix}/consumables/search?${qs}`);
      const odoMap = {};
      const dateMap = {};
      const kindsWithHistory = new Set();
      if (Array.isArray(rows)) {
        for (const r of rows) {
          const k = r.kind || r.label;
          if (!k) continue;
          kindsWithHistory.add(k);
          if (r.odo_km != null) {
            const val = Number(r.odo_km);
            if (Number.isFinite(val)) {
              odoMap[k] = Math.max(odoMap[k] ?? 0, val);
            }
          }
          if (r.date) {
            const t = Date.parse(r.date);
            if (!Number.isNaN(t)) {
              const prev = dateMap[k] ? Date.parse(dateMap[k]) : undefined;
              if (prev === undefined || t > prev) {
                dateMap[k] = String(r.date).slice(0, 10);
              }
            }
          }
        }
      }
      setMaxOdoByKind(odoMap);
      setMaxDateByKind(dateMap);
      if (shouldReset) {
        setItems((prev) =>
          prev.map((row) =>
            kindsWithHistory.has(row.kind)
              ? row
              : row.lastOdo || row.lastDate || row.cost || row.memo
              ? { ...row, lastOdo: "", lastDate: "", cost: "", memo: "" }
              : row,
          ),
        );
      }
    } catch (e) {
      console.error("전체 이력 집계 오류:", e);
    }
  };

  useEffect(() => {
    recomputeUsageStats();
    // eslint-disable-next-line react-hooks-exhaustive-deps
  }, [vehicleId, userId]);

  const openAllHistory = async () => {
    const rows = await fetchAllHistory();
    setHistoryModal({
      open: true,
      title: `전체 이력`,
      rows,
      scope: "all",
      itemKey: null,
    });
  };

  useEffect(() => {
    (async () => {
      if (historyModal.open && historyModal.scope === "all") {
        const rows = await fetchAllHistory();
        setHistoryModal((p) => ({ ...p, rows }));
      }
    })();
  }, [allSort]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteHistory = async (ids) => {
    if (!ids || ids.length === 0) return;
    const affectedKinds = new Set(
      historyModal.rows
        .filter((row) => ids.includes(row.id))
        .map((row) => row.kind || row.label)
        .filter(Boolean)
    );
    await request("post", `${apiPrefix}/consumables/bulk-delete`, { ids });
    if (historyModal.scope === "single" && historyModal.itemKey) {
      const rows = await fetchItemHistory(historyModal.itemKey);
      setHistoryModal((p) => ({ ...p, rows }));
    } else {
      const rows = await fetchAllHistory();
      setHistoryModal((p) => ({ ...p, rows }));
    }
    await recomputeUsageStats({ resetInputs: true });
    if (affectedKinds.size > 0) {
      setItems((prev) =>
        prev.map((row) =>
          affectedKinds.has(row.kind)
            ? { ...row, lastOdo: "", lastDate: "", cost: "", memo: "" }
            : row
        )
      );
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("consumables:changed"));
    }
  };

  const updateRow = async (row) => {
    const newCost = prompt("비용(원)을 수정하세요", row.cost ?? "");
    const newMemo = prompt("메모를 수정하세요", row.memo ?? "");
    const body = {};
    if (newCost !== null) body.cost = toIntOrNull(newCost);
    if (newMemo !== null) body.memo = newMemo;
    if (Object.keys(body).length === 0) return;
    await request("put", `${apiPrefix}/consumables/${row.id}`, body);
    if (historyModal.scope === "single" && historyModal.itemKey) {
      const rows = await fetchItemHistory(historyModal.itemKey);
      setHistoryModal((p) => ({ ...p, rows }));
    } else {
      const rows = await fetchAllHistory();
      setHistoryModal((p) => ({ ...p, rows }));
    }
  };

  const addItem = async () => {
    try {
      const body = {
        vehicle_id: vehicleId,
        category: CATEGORY,
        kind: "새 항목",
        mode: "distance",
        cycle_km: null,
        cycle_months: null,
        last_odo_km: null,
        last_date: null,
        cost: null,
        memo: "",
      };
      const created = await request("post", `${apiPrefix}/consumables/items`, body);
      setItems((prev) => [...prev, { ...created, key: created.kind, editingName: true, history: [], flash: null }]);
    } catch (e) {
      console.error("항목 추가 실패:", e);
      alert("항목 추가에 실패했습니다.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background-light text-text-light">
      <div className="space-y-6 px-4 py-6 pb-32">
        {!hideLocalBack && (
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="이전 화면으로"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border-light bg-surface-light text-primary shadow-sm transition hover:text-primary/80"
              onClick={() => (typeof onBack === "function" ? onBack() : window.history.back())}
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
            </button>
            <span className="text-xs text-subtext-light">등록된 항목 {items.length}개</span>
          </div>
        )}

        <section className="rounded-2xl border border-border-light bg-surface-light p-5 shadow-card">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-bold text-text-light">오일 관리</h1>
            <p className="text-sm text-subtext-light">주요 오일과 유체의 교체 주기를 카드 형태로 관리하세요.</p>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">등록 항목 {items.length}개</span>
            <span className={`rounded-full px-3 py-1 ${alertsEnabled ? "bg-emerald-100 text-emerald-600" : "bg-border-light/60 text-subtext-light"}`}>알림 {alertsEnabled ? "활성화" : "비활성"}</span>
          </div>
        </section>

        <div className="space-y-4">
          {items.map((it) => (
            <ItemCard
              key={it.id ?? it.key}
              item={it}
              state={it}
              currentMileage={currentMileage}
              onOpenDetail={(key) => setDetailModal({ open: true, itemKey: key })}
              onDelete={() => removeItem(it.key, it.id)}
              alertsEnabled={alertsEnabled}
              dueMessage="🚨 오일 교체 시기가 도래했습니다!"
              lastHistoryValue={
                it.mode === "distance"
                  ? (maxOdoByKind[it.kind] != null ? `${maxOdoByKind[it.kind]} km` : null)
                  : maxDateByKind[it.kind] || null
              }
              lastHistoryDate={maxDateByKind[it.kind] || null}
            />
          ))}
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={addItem}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            새 항목 추가
          </button>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await request("post", `${apiPrefix}/consumables/items/reset?vehicleId=${vehicleId}&category=${encodeURIComponent(CATEGORY)}`);
                  alert("기본 항목으로 초기화되었습니다.");
                  const data = await request("get", `${apiPrefix}/consumables/items?vehicleId=${vehicleId}&category=${encodeURIComponent(CATEGORY)}`);
                  setItems(
                    data.map((r) => ({
                      id: r.id,
                      key: r.kind,
                      kind: r.kind,
                      mode: r.mode || "distance",
                      lastOdo: "",
                      lastDate: "",
                      cycleKm: r.cycleKm ?? "",
                      cycleMonths: r.cycleMonths ?? "",
                      cost: "",
                      memo: "",
                      history: [],
                      flash: null,
                    }))
                  );
                } catch (e) {
                  console.error("기본 항목 초기화 실패:", e);
                  alert("초기화에 실패했습니다.");
                }
              }}
              className="flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-full border border-border-light bg-surface-light px-4 py-2 text-sm font-semibold text-subtext-light transition hover:border-primary hover:text-primary"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
              기본 항목으로 초기화
            </button>
            <button
              type="button"
              onClick={openAllHistory}
              className="flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600"
            >
              <span className="material-symbols-outlined text-base">history</span>
              전체 이력 보기
            </button>          </div>
        </div>
      </div>

      <DetailModal
        open={detailModal.open}
        item={activeItem}
        onClose={() => setDetailModal({ open: false, itemKey: null })}
        onChange={change}
        onSaveHistory={saveHistory}
        onSaveConfig={saveConfig}
        onOpenHistory={(key) => {
          setDetailModal({ open: false, itemKey: null });
          openHistory(key);
        }}
      />

      <HistoryModal
        open={historyModal.open}
        onClose={() => setHistoryModal((prev) => ({ ...prev, open: false }))}
        title={historyModal.title}
        rows={historyModal.rows}
        onDeleteSelected={deleteHistory}
        onUpdateRow={updateRow}
        scope={historyModal.scope}
        sort={allSort}
        onChangeSort={setAllSort}
      />
    </div>
  );
}
