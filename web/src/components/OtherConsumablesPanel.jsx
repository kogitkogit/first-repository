import React, { useEffect, useMemo, useState } from "react";

const CATEGORY = "소모품";

const DEFAULTS = {
  "와이퍼 블레이드": { cycleKm: 0, cycleMonths: 6, defaultMode: "time" },
  "배터리": { cycleKm: 0, cycleMonths: 36, defaultMode: "time" },
  "브레이크 패드": { cycleKm: 30000, cycleMonths: 24, defaultMode: "distance" },
  "스파크 플러그": { cycleKm: 60000, cycleMonths: 48, defaultMode: "distance" },
};

const BASE_ITEMS = Object.keys(DEFAULTS).map((kind) => ({ key: kind, kind }));

const toIntOrNull = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

const isYmd = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);


function ItemCard({ item, state, onChange, onSaveHistory, onSaveConfig, onOpenHistory, currentMileage, onDelete, alertsEnabled = false, dueMessage, lastHistoryValue, onToggle }) {
  const mode = state.mode || "distance";
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const isCollapsed = Boolean(state.collapsed);

  const statusNode = useMemo(() => {
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
      const baseOdo = toIntOrNull(state.lastOdo) ?? parseOdoFromHistory(lastHistoryValue);
      if (currentMileage != null && baseOdo != null && state.cycleKm) {
        const used = Number(currentMileage) - Number(baseOdo);
        const remain = Number(state.cycleKm || 0) - used;
        if (!Number.isFinite(remain)) return "교체 정보를 입력해주세요.";
        const isDue = remain <= 0;
        const node = (
          <span className={"whitespace-nowrap " + (isDue ? "text-red-600 font-semibold" : "text-gray-600")}>
            {isDue ? "교체 시기 도래!" : `남은 주행거리: ${Math.max(remain, 0)} km`}
          </span>
        );
        if (alertsEnabled && dueMessage && isDue) {
          return (
            <div className="flex flex-col gap-1">
              {node}
              <div className="rounded-md bg-yellow-100 px-3 py-2 text-xs font-semibold text-yellow-800">{dueMessage}</div>
            </div>
          );
        }
        return node;
      }
    }

    if (mode === "time") {
      const baseDate = isYmd(state.lastDate) ? state.lastDate : parseDateFromHistory(lastHistoryValue);
      if (baseDate && state.cycleMonths) {
        const last = new Date(baseDate);
        const now = new Date();
        const diffMonths = (now.getFullYear() - last.getFullYear()) * 12 + (now.getMonth() - last.getMonth());
        const remain = Number(state.cycleMonths || 0) - diffMonths;
        if (!Number.isFinite(remain)) return "교체 정보를 입력해주세요.";
        const isDue = remain <= 0;
        const node = (
          <span className={"whitespace-nowrap " + (isDue ? "text-red-600 font-semibold" : "text-gray-600")}>
            {isDue ? "교체 시기 도래!" : `남은 기간: ${Math.max(remain, 0)} 개월`}
          </span>
        );
        if (alertsEnabled && dueMessage && isDue) {
          return (
            <div className="flex flex-col gap-1">
              {node}
              <div className="rounded-md bg-yellow-100 px-3 py-2 text-xs font-semibold text-yellow-800">{dueMessage}</div>
            </div>
          );
        }
        return node;
      }
    }

    return "교체 정보를 입력해주세요.";
  }, [mode, currentMileage, state.lastOdo, state.cycleKm, state.lastDate, state.cycleMonths, alertsEnabled, dueMessage, lastHistoryValue]);

  const flash = state.flash;

  const handleConfigSave = () => onSaveConfig?.(item.key);
  const handleHistorySave = () => onSaveHistory?.(item.key);

  return (
    <article className="rounded-2xl border border-border-light bg-surface-light p-5 shadow-card space-y-5">
      <header className="space-y-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            {state.editingName ? (
              <input
                className="flex-1 rounded-xl border border-primary/40 bg-background-light px-3 py-2 text-lg font-semibold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={state.kind}
                onChange={(e) => onChange(item.key, "kind", e.target.value)}
                onBlur={() => onChange(item.key, "editingName", false)}
                autoFocus
              />
            ) : (
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="text-lg font-semibold text-text-light">{state.kind}</h3>
                <button
                  type="button"
                  aria-label="이름 수정"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-light bg-white text-text-light transition hover:border-primary hover:text-primary"
                  onClick={() => onChange(item.key, "editingName", true)}
                >
                  <span className="material-symbols-outlined text-base">edit</span>
                </button>
              </div>
            )}
            {confirmDelete ? (
              <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-text-light">
                <span className="font-semibold text-red-600 whitespace-nowrap">정말 삭제할까요?</span>
                <button
                  type="button"
                  className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-semibold text-red-600 transition hover:text-red-500"
                  onClick={() => onDelete(item.key, state.id)}
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                  <span>삭제</span>
                </button>
                <button
                  type="button"
                  className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-semibold text-subtext-light transition hover:text-primary"
                  onClick={() => setConfirmDelete(false)}
                >
                  <span className="material-symbols-outlined text-base">close</span>
                  <span>취소</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-semibold text-red-600 transition hover:text-red-500"
                onClick={() => setConfirmDelete(true)}
              >
                <span className="material-symbols-outlined text-base">delete</span>
                <span>삭제</span>
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-subtext-light">
            <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
              {lastHistoryValue || "저장된 이력이 없습니다."}
            </span>
            <button
              type="button"
              aria-label={isCollapsed ? "펼치기" : "접기"}
              aria-expanded={!isCollapsed}
              onClick={() => onToggle?.(item.key)}
              className="ml-auto flex h-7 w-7 items-center justify-center rounded-full border border-border-light bg-background-light text-subtext-light transition hover:text-primary"
            >
              <span className="material-symbols-outlined text-base">{isCollapsed ? "expand_more" : "expand_less"}</span>
            </button>
          </div>
          <div className="text-sm font-semibold text-primary">
            {statusNode || "교체 정보를 입력해주세요."}
          </div>
        </div>
      </header>

      {!isCollapsed && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex flex-col gap-2 text-sm">
                <span className="text-xs font-semibold text-subtext-light">관리 방식</span>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <select
                    value={state.mode}
                    onChange={(e) => onChange(item.key, "mode", e.target.value)}
                    className="h-11 rounded-xl border border-border-light bg-background-light px-3 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="distance">주행거리 기준</option>
                    <option value="time">기간 기준</option>
                  </select>
                  <input
                    type="number"
                    placeholder={state.mode === "distance" ? "주기 (km)" : "주기 (개월)"}
                    value={state.mode === "distance" ? state.cycleKm || "" : state.cycleMonths || ""}
                    onChange={(e) =>
                      onChange(item.key, state.mode === "distance" ? "cycleKm" : "cycleMonths", e.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-border-light bg-background-light px-3 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-32"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-4 md:border-l md:border-border-light md:pl-6">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-subtext-light">최근 교체 정보</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="text-xs font-medium text-subtext-light">마지막 교체 주행거리</span>
                    <input
                      type="number"
                      placeholder="예: 125000"
                      value={state.lastOdo || ""}
                      onChange={(e) => onChange(item.key, "lastOdo", e.target.value)}
                      className="h-11 rounded-xl border border-border-light bg-background-light px-3 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="text-xs font-medium text-subtext-light">마지막 교체일</span>
                    <input
                      type="date"
                      value={state.lastDate || ""}
                      onChange={(e) => onChange(item.key, "lastDate", e.target.value)}
                      className="h-11 rounded-xl border border-border-light bg-background-light px-3 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 sm:justify-items-end">
                <label className="flex w-full flex-col gap-2 text-sm sm:max-w-[150px] sm:text-right">
                  <span className="text-xs font-semibold text-subtext-light">비용 (원)</span>
                  <input
                    type="number"
                    placeholder="예: 45000"
                    value={state.cost || ""}
                    onChange={(e) => onChange(item.key, "cost", e.target.value)}
                    className="h-11 rounded-xl border border-border-light bg-background-light px-3 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-right"
                  />
                </label>
                <label className="flex w-full flex-col gap-2 text-sm sm:max-w-[200px] sm:text-right">
                  <span className="text-xs font-semibold text-subtext-light">메모</span>
                  <input
                    type="text"
                    placeholder="필요하면 메모를 남겨주세요"
                    value={state.memo || ""}
                    onChange={(e) => onChange(item.key, "memo", e.target.value)}
                    className="h-11 rounded-xl border border-border-light bg-background-light px-3 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={handleConfigSave}
              className="flex items-center gap-2 rounded-full border border-border-light px-4 py-2 text-sm font-semibold text-subtext-light transition hover:border-primary hover:text-primary"
            >
              <span className="material-symbols-outlined text-base">tune</span>
              관리 방식 저장
            </button>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onOpenHistory(item.key)}
                className="flex items-center gap-2 rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600"
              >
                <span className="material-symbols-outlined text-base">history</span>
                이력 보기
              </button>
              <button
                type="button"
                onClick={handleHistorySave}
                className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                <span className="material-symbols-outlined text-base">save</span>
                이력 기록
              </button>
            </div>
          </div>
        </>
      )}

      {(flash === "history-saved" || flash === "saved") && (
        <div className="text-sm font-semibold text-emerald-600">이력 기록이 저장되었습니다.</div>
      )}
      {flash === "config-saved" && (
        <div className="text-sm font-semibold text-emerald-600">관리 방식이 저장되었습니다.</div>
      )}
      {flash && flash.startsWith("err:") && (
        <div className="text-sm font-semibold text-red-600">{flash.replace("err:", "")}</div>
      )}
    </article>
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
                <th className="p-2 border whitespace-nowrap">기준(날짜/주행거리)</th>
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
                    <td className="p-2 border whitespace-nowrap">{r.kind || r.label || r.label}</td>
                    <td className="p-2 border whitespace-nowrap">
                      {r.date ? r.date : (r.odo_km != null ? `${r.odo_km} km` : "-")}
                    </td>
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

export default function OtherConsumablesPanel({ currentMileage, vehicleId, apiClient, onBack, hideLocalBack }) {
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
      collapsed: true,
    }))
  );

  const [historyModal, setHistoryModal] = useState({
    open: false,
    title: "",
    rows: [],
    scope: "single",
    itemKey: null,
  });
  const [alertsEnabled, setAlertsEnabled] = useState(false);

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
      const uid = (typeof window !== "undefined" && (window.__USER_ID__ || localStorage.getItem("user_id"))) || null;
      if (!uid || !vehicleId) return;
      const url = `${apiPrefix || ""}/notifications?userId=${uid}&vehicleId=${vehicleId}`;
      const run = async () => {
        const res = await request("get", url);
        const data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        const target = Array.isArray(data) ? data.find((n) => n.type === "consumable") : null;
        setAlertsEnabled(!!target?.enabled);
      };
      run();
    } catch (e) {
      console.error("알림 설정 불러오기 실패:", e);
    }
  }, [vehicleId]);
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
            lastOdo: r.lastOdo ?? "",
            lastDate: r.lastDate ?? "",
            cycleKm: r.cycleKm ?? "",
            cycleMonths: r.cycleMonths ?? "",
            cost: r.cost ?? "",
            memo: r.memo ?? "",
            history: [],
            flash: null,
          collapsed: true,
          }))
        );
      } catch (e) {
        console.error("항목 불러오기 실패:", e);
      }
    };
    if (vehicleId) loadItems();
  }, [vehicleId]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = (key, field, value) => {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, [field]: value } : it)));
  };

  const toggleCollapsed = (key) => {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, collapsed: !it.collapsed } : it)));
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
        prev.map((row) => (row.key === key ? { ...row, flash: "history-saved" } : row))
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
  useEffect(() => {
    (async () => {
      if (!vehicleId) return;
      try {
        // 정렬에 상관없이 전체 로우를 받아 계산
        const qs = new URLSearchParams({
          vehicleId: String(vehicleId),
          category: CATEGORY,
          sort: "id",
          order: "desc",
        }).toString();
        const rows = await request("get", `${apiPrefix}/consumables/search?${qs}`);
        const odoMap = {};
        const dateMap = {};
        if (Array.isArray(rows)) {
          for (const r of rows) {
            const k = r.kind || r.label || r.label;
            if (!k) continue;
            if (r.odo_km != null) {
              const val = Number(r.odo_km);
              if (Number.isFinite(val)) {
                odoMap[k] = Math.max(odoMap[k] ?? 0, val);
              }
            }
            if (r.date) {
              const t = Date.parse(r.date);
              if (!isNaN(t)) {
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
      } catch (e) {
        console.error("전체 이력 계산 실패:", e);
      }
    })();
  }, [vehicleId]);

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
    await request("post", `${apiPrefix}/consumables/bulk-delete`, { ids });
    if (historyModal.scope === "single" && historyModal.itemKey) {
      const rows = await fetchItemHistory(historyModal.itemKey);
      setHistoryModal((p) => ({ ...p, rows }));
    } else {
      const rows = await fetchAllHistory();
      setHistoryModal((p) => ({ ...p, rows }));
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
      setItems((prev) => [...prev, { ...created, key: created.kind, editingName: true, history: [], flash: null, collapsed: false }]);
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
            <h1 className="text-xl font-bold text-text-light">소모품 관리</h1>
            <p className="text-sm text-subtext-light">와이퍼, 배터리 등 기타 소모품의 교체 시기를 관리하세요.</p>
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
              onChange={change}
              onSaveHistory={saveHistory}
              onSaveConfig={saveConfig}
              onOpenHistory={openHistory}
              onDelete={() => removeItem(it.key, it.id)}
              alertsEnabled={alertsEnabled}
              dueMessage="소모품 교체 시기가 도래했습니다!"
              onToggle={toggleCollapsed}
              lastHistoryValue={
                it.mode === "distance"
                  ? (maxOdoByKind[it.kind] != null ? `${maxOdoByKind[it.kind]} km` : null)
                  : maxDateByKind[it.kind] || null
              }
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
                      lastOdo: r.lastOdo ?? "",
                      lastDate: r.lastDate ?? "",
                      cycleKm: r.cycleKm ?? "",
                      cycleMonths: r.cycleMonths ?? "",
                      cost: r.cost ?? "",
                      memo: r.memo ?? "",
                      history: [],
                      flash: null,
                    }))
                  );
                } catch (e) {
                  console.error("리셋 실패:", e);
                  alert("리셋 실패");
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
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={openAllHistory} className="bg-indigo-500 text-white rounded px-3 py-1 hover:bg-indigo-600">
            전체 이력 보기
          </button>
        </div>
      </div>

      <HistoryModal
        open={historyModal.open}
        onClose={() => setHistoryModal((p) => ({ ...p, open: false }))}
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




