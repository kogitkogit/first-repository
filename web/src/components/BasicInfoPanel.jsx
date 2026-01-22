import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/client";

const formatNumber = (value) => {
  if (value === null || value === undefined) return "-";
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return num.toLocaleString();
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
};

const getExpiryStatus = (value) => {
  if (!value) {
    return { tone: "muted", text: "일정 없음" };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { tone: "muted", text: "날짜 확인 필요" };
  }
  const today = new Date();
  const diffMs = date.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return { tone: "danger", text: `${Math.abs(diffDays)}일 경과` };
  }
  if (diffDays <= 30) {
    return { tone: "warn", text: `${diffDays}일 남음` };
  }
  return { tone: "ok", text: `${diffDays}일 남음` };
};

const badgeToneClass = (tone) => {
  switch (tone) {
    case "ok":
      return "bg-emerald-100 text-emerald-700";
    case "warn":
      return "bg-amber-100 text-amber-700";
    case "danger":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

const baseIconMap = {
  "차량 번호": "pin",
  "제조사": "factory",
  "차량 모델": "directions_car",
  "연식": "calendar_month",
  "현재 주행거리": "speed",
  "차량 종류": "category",
  "배기량": "toll",
  "소유자": "person",
};

const scheduleIconMap = {
  "보험 만기일": "event_available",
  "다음 정기검사": "event_repeat",
  "보험사": "apartment",
  "보험료": "savings",
  "차량세 납부 기한": "schedule",
  "납부 여부": "check_circle",
};

function InfoItem({ label, value, badge, icon, onClick }) {
  const Wrapper = onClick ? "button" : "div";
  const wrapperProps = onClick
    ? {
        type: "button",
        onClick,
        className:
          "w-full rounded-2xl border border-border-light bg-surface-light p-4 text-left shadow-sm transition hover:border-primary",
      }
    : {
        className: "rounded-2xl border border-border-light bg-surface-light p-4 shadow-sm",
      };

  return (
    <Wrapper {...wrapperProps}>
      <div className="flex items-start gap-3">
        {icon ? (
          <span className="material-symbols-outlined flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            {icon}
          </span>
        ) : null}
        <div className="flex-1 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-subtext-light">{label}</p>
          <p className="text-sm font-semibold text-text-light">{value}</p>
          {badge ? (
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeToneClass(badge.tone)}`}>
              {badge.text}
            </span>
          ) : null}
        </div>
      </div>
    </Wrapper>
  );
}

export default function BasicInfoPanel({ vehicle, onRefresh }) {
  const [legalInfo, setLegalInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailFold, setDetailFold] = useState({ insurance: true, inspection: true });
  const [currentOdo, setCurrentOdo] = useState(null);
  const [odoDeleteOpen, setOdoDeleteOpen] = useState(false);
  const [odoLogs, setOdoLogs] = useState([]);
  const [odoLogLoading, setOdoLogLoading] = useState(false);
  const [odoLogError, setOdoLogError] = useState("");
  const [odoSelected, setOdoSelected] = useState({});

  const loadLegalInfo = useCallback(async () => {
    if (!vehicle?.id) {
      setLegalInfo(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/legal/list", { params: { vehicleId: vehicle.id } });
      const records = Array.isArray(response.data) ? response.data : [];
      setLegalInfo(records[0] ?? null);
    } catch (err) {
      console.error("법적 정보를 불러오지 못했습니다.", err);
      setError("법적 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      setLegalInfo(null);
    } finally {
      setLoading(false);
    }
  }, [vehicle?.id]);

  const loadCurrentOdo = useCallback(async () => {
    if (!vehicle?.id) {
      setCurrentOdo(null);
      return;
    }
    try {
      const res = await api.get("/odometer/current", { params: { vehicleId: vehicle.id } });
      setCurrentOdo(res.data?.odo_km ?? null);
    } catch (err) {
      console.error("주행거리 정보를 불러오지 못했습니다.", err);
      setCurrentOdo(null);
    }
  }, [vehicle?.id]);

  useEffect(() => {
    loadLegalInfo();
    loadCurrentOdo();
  }, [loadLegalInfo, loadCurrentOdo]);

  const handleRefreshClick = async () => {
    await Promise.all([
      loadLegalInfo(),
      loadCurrentOdo(),
      onRefresh ? onRefresh(vehicle.id) : Promise.resolve(),
    ]);
  };

  const loadOdoLogs = async () => {
    if (!vehicle?.id) return;
    setOdoLogLoading(true);
    setOdoLogError("");
    try {
      const res = await api.get("/odometer/logs", { params: { vehicleId: vehicle.id } });
      const rows = Array.isArray(res.data) ? res.data : [];
      setOdoLogs(rows);
      setOdoSelected({});
    } catch (err) {
      console.error("주행 이력 불러오기 실패:", err);
      setOdoLogError("주행 이력을 불러오지 못했습니다.");
    } finally {
      setOdoLogLoading(false);
    }
  };

  const openOdoDeleteModal = async () => {
    setOdoDeleteOpen(true);
    await loadOdoLogs();
  };

  const closeOdoDeleteModal = () => {
    setOdoDeleteOpen(false);
    setOdoSelected({});
  };

  const toggleOdoSelected = (id) => {
    setOdoSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleOdoSelectAll = () => {
    if (!odoLogs.length) return;
    const selectedCount = Object.values(odoSelected).filter(Boolean).length;
    if (selectedCount === odoLogs.length) {
      setOdoSelected({});
      return;
    }
    const next = {};
    odoLogs.forEach((row) => {
      next[row.id] = true;
    });
    setOdoSelected(next);
  };

  const handleOdoDelete = async () => {
    if (!vehicle?.id) return;
    const ids = Object.keys(odoSelected).filter((id) => odoSelected[id]).map(Number);
    if (!ids.length) {
      alert("삭제할 이력을 선택해주세요.");
      return;
    }
    if (!confirm("선택한 주행 이력을 삭제할까요? 삭제 후 복구할 수 없습니다.")) {
      return;
    }
    try {
      await api.post("/odometer/delete", { vehicleId: vehicle.id, ids });
      if (onRefresh) {
        await onRefresh(vehicle.id);
      }
      await loadCurrentOdo();
      await loadOdoLogs();
    } catch (err) {
      console.error("주행 이력 삭제 실패:", err);
      alert("주행 이력 삭제에 실패했습니다.");
    }
  };

  const insuranceExpiry = legalInfo?.insurance_expiry ?? vehicle?.insurance_exp;
  const nextInspectionDate = legalInfo?.next_inspection_date;

  const baseInfoItems = useMemo(() => {
    if (!vehicle) return [];
    const odoLabel =
      currentOdo != null ? `${formatNumber(currentOdo)} km` : "주행거리 정보 없음";
    const items = [
      { label: "차량 번호", value: vehicle.plate_no || "-" },
      { label: "제조사", value: vehicle.maker || "-" },
      { label: "차량 모델", value: vehicle.model || "-" },
      { label: "연식", value: vehicle.year || "-" },
      { label: "현재 주행거리", value: odoLabel },
      { label: "차량 종류", value: vehicle.makerType || "-" },
    ];
    return items.map((item) => ({
      ...item,
      icon: baseIconMap[item.label] || "info",
    }));
  }, [vehicle, currentOdo]);

  const insuranceItems = useMemo(() => {
    const items = [
      {
        label: "보험 만기일",
        value: formatDate(insuranceExpiry),
        badge: getExpiryStatus(insuranceExpiry),
      },
      {
        label: "보험사",
        value: legalInfo?.insurance_company || "-",
      },
      {
        label: "보험료",
        value: legalInfo?.insurance_fee != null ? `${formatNumber(legalInfo.insurance_fee)} 원` : "-",
      },
    ];
    return items.map((item) => ({
      ...item,
      icon: scheduleIconMap[item.label] || "info",
    }));
  }, [insuranceExpiry, legalInfo]);

  const inspectionItems = useMemo(() => {
    const items = [
      {
        label: "다음 정기검사",
        value: formatDate(nextInspectionDate),
        badge: getExpiryStatus(nextInspectionDate),
      },
    ];
    return items.map((item) => ({
      ...item,
      icon: scheduleIconMap[item.label] || "info",
    }));
  }, [nextInspectionDate, legalInfo]);

  const taxItems = useMemo(() => {
    const items = [
      {
        label: "차량세 납부 기한",
        value: formatDate(legalInfo?.tax_due_date),
        badge: getExpiryStatus(legalInfo?.tax_due_date),
      },
      {
        label: "납부 여부",
        value: legalInfo?.tax_paid ? "납부 완료" : "미납",
        badge: legalInfo?.tax_paid
          ? { tone: "ok", text: "납부 완료" }
          : { tone: "warn", text: "확인 필요" },
      },
    ];
    return items.map((item) => ({
      ...item,
      icon: scheduleIconMap[item.label] || "info",
    }));
  }, [legalInfo]);

  const inspectionDetailItems = useMemo(
    () => [...inspectionItems, ...taxItems],
    [inspectionItems, taxItems],
  );

  const mainSummary = useMemo(() => {
    if (!vehicle) return null;
    const titleParts = [vehicle.maker, vehicle.model].filter(Boolean);
    const title = titleParts.length ? titleParts.join(" ") : vehicle.plate_no || "차량 정보";
    const subtitle = vehicle.plate_no ? `차량 번호 ${vehicle.plate_no}` : "차량 번호 정보 없음";
    const odoLabel =
      currentOdo != null ? `${formatNumber(currentOdo)} km` : "주행거리 정보 없음";
    const chips = [
      { icon: "calendar_month", label: "연식", value: vehicle.year || "-" },
      { icon: "speed", label: "현재 주행거리", value: odoLabel, isOdo: true },
      { icon: "event_available", label: "보험 만기", value: formatDate(insuranceExpiry) },
    ];
    return {
      title,
      subtitle,
      chips,
    };
  }, [vehicle, insuranceExpiry, currentOdo]);

  if (!vehicle) {
    return (
      <div className="px-4 py-6 text-sm text-subtext-light">
        차량을 다시 선택해주세요.
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6 pb-24">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-border-light bg-background-light/70 px-4 py-6 text-center text-sm text-subtext-light">
          기본 정보를 불러오는 중입니다...
        </div>
      ) : null}

      <section className="space-y-4 rounded-2xl border border-border-light bg-surface-light p-5 shadow-card">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-1">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                directions_car
              </span>
              <div className="flex w-full items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    차량 기본정보
                  </p>
                  <h1 className="text-xl font-bold text-text-light">
                    {mainSummary.title}
                  </h1>
                  <p className="text-sm text-subtext-light">
                    {mainSummary.subtitle}
                  </p>
                </div>
                <div className="flex items-center gap-3 self-start">
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-full border border-border-light bg-surface-light px-4 py-2 text-sm font-semibold text-subtext-light transition hover:text-primary"
                    onClick={handleRefreshClick}
                  >
                    <span className="material-symbols-outlined text-base">refresh</span>
                    새로고침
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {mainSummary.chips.map((chip) => {
            const content = (
              <>
                <span className="material-symbols-outlined flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {chip.icon}
                </span>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-subtext-light">
                    {chip.label}
                  </p>
                  <p className="text-sm font-semibold text-text-light">{chip.value}</p>
                </div>
              </>
            );
            if (chip.isOdo) {
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={openOdoDeleteModal}
                  className="flex items-center gap-3 rounded-xl border border-border-light bg-background-light px-3 py-3 text-left transition hover:border-primary"
                >
                  {content}
                </button>
              );
            }
            return (
              <div
                key={chip.label}
                className="flex items-center gap-3 rounded-xl border border-border-light bg-background-light px-3 py-3"
              >
                {content}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-primary">info</span>
          <h2 className="text-base font-semibold text-text-light">기본 정보</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {baseInfoItems.map((item) => (
            <InfoItem
              key={item.label}
              label={item.label}
              value={item.value}
              icon={item.icon}
              onClick={item.label === "현재 주행거리" ? openOdoDeleteModal : undefined}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-primary">inventory_2</span>
          <h2 className="text-base font-semibold text-text-light">세부 정보</h2>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-border-light bg-surface-light p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">shield_person</span>
                <h3 className="text-sm font-semibold text-text-light">보험 정보</h3>
              </div>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border-light bg-background-light text-subtext-light transition hover:text-primary"
                onClick={() =>
                  setDetailFold((prev) => ({ ...prev, insurance: !prev.insurance }))
                }
              >
                <span className="material-symbols-outlined text-base">
                  {detailFold.insurance ? "expand_more" : "expand_less"}
                </span>
              </button>
            </div>
            {!detailFold.insurance && (
              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
                {insuranceItems.map((item) => (
                  <InfoItem
                    key={`${item.label}-${item.value}`}
                    label={item.label}
                    value={item.value}
                    badge={item.badge}
                    icon={item.icon}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border-light bg-surface-light p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">fact_check</span>
                <h3 className="text-sm font-semibold text-text-light">점검 · 세금</h3>
              </div>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border-light bg-background-light text-subtext-light transition hover:text-primary"
                onClick={() =>
                  setDetailFold((prev) => ({ ...prev, inspection: !prev.inspection }))
                }
              >
                <span className="material-symbols-outlined text-base">
                  {detailFold.inspection ? "expand_more" : "expand_less"}
                </span>
              </button>
            </div>
            {!detailFold.inspection && (
              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
                {inspectionDetailItems.map((item) => (
                  <InfoItem
                    key={`${item.label}-${item.value}`}
                    label={item.label}
                    value={item.value}
                    badge={item.badge}
                    icon={item.icon}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {legalInfo?.memo && (
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-text-light">메모</h2>
          <div className="rounded-2xl border border-border-light bg-surface-light p-4 text-sm text-text-light shadow-sm">
            {legalInfo.memo}
          </div>
        </section>
      )}

      {odoDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border-light bg-background-light p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-text-light">주행 이력 삭제</h3>
              <button
                type="button"
                className="text-subtext-light transition hover:text-text-light"
                onClick={closeOdoDeleteModal}
              >
                닫기
              </button>
            </div>
            <p className="mt-2 text-xs text-subtext-light">
              삭제할 이력을 선택하세요. 삭제된 이력은 복구할 수 없습니다.
            </p>
            <div className="mt-3 max-h-[50vh] space-y-2 overflow-auto">
              {odoLogLoading ? (
                <div className="rounded-xl border border-border-light bg-background-light/70 px-4 py-4 text-center text-sm text-subtext-light">
                  주행 이력을 불러오는 중입니다...
                </div>
              ) : odoLogError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {odoLogError}
                </div>
              ) : odoLogs.length === 0 ? (
                <div className="rounded-xl border border-border-light bg-background-light/70 px-4 py-4 text-center text-sm text-subtext-light">
                  저장된 주행 이력이 없습니다.
                </div>
              ) : (
                odoLogs.map((row) => (
                  <label
                    key={row.id}
                    className="flex items-center gap-3 rounded-xl border border-border-light bg-white px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(odoSelected[row.id])}
                      onChange={() => toggleOdoSelected(row.id)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-text-light">
                        {Number(row.odo_km || 0).toLocaleString()} km
                      </p>
                      <p className="text-xs text-subtext-light">{row.date || "-"}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                className="flex-1 rounded-full border border-border-light px-4 py-2 text-sm font-semibold text-subtext-light transition hover:text-primary"
                onClick={toggleOdoSelectAll}
                disabled={odoLogLoading || odoLogs.length === 0}
              >
                전체 선택
              </button>
              <button
                type="button"
                className="flex-1 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
                onClick={handleOdoDelete}
                disabled={odoLogLoading || odoLogs.length === 0}
              >
                선택 삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
