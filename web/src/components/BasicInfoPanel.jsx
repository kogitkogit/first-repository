import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { buildVehicleImageUrl } from "../utils/vehicleImages";

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
  "정기검사 일자": "fact_check",
  "다음 정기검사": "event_repeat",
  "보험사": "apartment",
  "보험 증권 번호": "confirmation_number",
  "보험료": "savings",
  "검사 기관": "engineering",
  "검사 결과": "task_alt",
};

const registrationIconMap = {
  "등록 번호": "badge",
  "등록 관청": "domain",
  "등록 일자": "calendar_today",
  "등록 종류": "category",
  "자동차세 연도": "date_range",
  "자동차세 금액": "payments",
  "차량세 납부 기한": "schedule",
  "납부 여부": "check_circle",
};

function InfoItem({ label, value, badge, icon }) {
  return (
    <div className="rounded-2xl border border-border-light bg-surface-light p-4 shadow-sm">
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
    </div>
  );
}

export default function BasicInfoPanel({ vehicle, onRefresh }) {
  const [legalInfo, setLegalInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailFold, setDetailFold] = useState({ insurance: true, inspection: true });
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

  useEffect(() => {
    loadLegalInfo();
  }, [loadLegalInfo]);

  if (!vehicle) {
    return (
      <div className="px-4 py-6 text-sm text-subtext-light">
        차량을 다시 선택해주세요.
      </div>
    );
  }

  const handleRefreshClick = async () => {
    await Promise.all([
      loadLegalInfo(),
      onRefresh ? onRefresh(vehicle.id) : Promise.resolve(),
    ]);
  };

  const insuranceExpiry = legalInfo?.insurance_expiry ?? vehicle.insurance_exp;
  const inspectionDate = legalInfo?.inspection_date ?? vehicle.insp_exp;
  const nextInspectionDate = legalInfo?.next_inspection_date;

  const baseInfoItems = useMemo(() => {
    const duplicatedLabels = new Set(["차량 번호", "제조사", "차량 모델", "연식", "현재 주행거리"]);
    const items = [
      { label: "차량 번호", value: vehicle.plate_no || "-" },
      { label: "제조사", value: vehicle.maker || "-" },
      { label: "차량 모델", value: vehicle.model || "-" },
      { label: "연식", value: vehicle.year || "-" },
      { label: "현재 주행거리", value: `${formatNumber(vehicle.odo_km)} km` },
      { label: "차량 종류", value: vehicle.makerType || "-" },
      {
        label: "배기량",
        value: vehicle.displacement_cc ? `${formatNumber(vehicle.displacement_cc)} cc` : "-",
      },
      { label: "소유자", value: vehicle.owner_name || "-" },
    ];
    return items
      .filter((item) => !duplicatedLabels.has(item.label))
      .map((item) => ({
        ...item,
        icon: baseIconMap[item.label] || "info",
      }));
  }, [vehicle]);

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
        label: "보험 증권 번호",
        value: legalInfo?.insurance_number || "-",
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
        label: "정기검사 일자",
        value: formatDate(inspectionDate),
        badge: getExpiryStatus(inspectionDate),
      },
      {
        label: "다음 정기검사",
        value: formatDate(nextInspectionDate),
        badge: getExpiryStatus(nextInspectionDate),
      },
      {
        label: "검사 기관",
        value: legalInfo?.inspection_center || "-",
      },
      {
        label: "검사 결과",
        value: legalInfo?.inspection_result || "-",
      },
    ];
    return items.map((item) => ({
      ...item,
      icon: scheduleIconMap[item.label] || "info",
    }));
  }, [inspectionDate, nextInspectionDate, legalInfo]);

  const registrationItems = useMemo(() => {
    const items = [
      { label: "등록 번호", value: legalInfo?.registration_number || "-" },
      { label: "등록 관청", value: legalInfo?.registration_office || "-" },
      { label: "등록 일자", value: formatDate(legalInfo?.registration_date) },
      { label: "등록 종류", value: legalInfo?.registration_type || "-" },
      { label: "자동차세 연도", value: legalInfo?.tax_year || "-" },
      {
        label: "자동차세 금액",
        value: legalInfo?.tax_amount != null ? `${formatNumber(legalInfo.tax_amount)} 원` : "-",
      },
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
      icon: registrationIconMap[item.label] || "info",
    }));
  }, [legalInfo]);

  const inspectionDetailItems = useMemo(
    () => [...inspectionItems, ...registrationItems],
    [inspectionItems, registrationItems],
  );

  const mainSummary = useMemo(() => {
    const titleParts = [vehicle.maker, vehicle.model].filter(Boolean);
    const title = titleParts.length ? titleParts.join(" ") : vehicle.plate_no || "차량 정보";
    const subtitle = vehicle.plate_no ? `차량 번호 ${vehicle.plate_no}` : "차량 번호 정보 없음";
    const chips = [
      { icon: "calendar_month", label: "연식", value: vehicle.year || "-" },
      { icon: "speed", label: "현재 주행거리", value: `${formatNumber(vehicle.odo_km)} km` },
      { icon: "event_available", label: "보험 만기", value: formatDate(insuranceExpiry) },
      { icon: "event_repeat", label: "다음 검사 예정", value: formatDate(nextInspectionDate) },
    ];
    const image = buildVehicleImageUrl(vehicle?.model, api.defaults.baseURL);
    return {
      title,
      subtitle,
      owner: vehicle.owner_name || "-",
      vehicleType: vehicle.makerType || "-",
      chips,
      image,
    };
  }, [vehicle, insuranceExpiry, nextInspectionDate]);

  return (
    <div className="space-y-6 px-4 py-6 pb-24">
      
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-border-light bg-background-light/70 px-4 py-6 text-center text-sm text-subtext-light">
          기본 정보를 불러오는 중입니다...
        </div>
      ) : null}

      <section className="space-y-4 rounded-2xl border border-border-light bg-surface-light p-5 shadow-card">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-1 md:max-w-xl">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                directions_car
              </span>
              <div className="flex w-full items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">차량 기본정보</p>
                  <h1 className="text-xl font-bold text-text-light">{mainSummary.title}</h1>
                  <p className="text-sm text-subtext-light">{mainSummary.subtitle}</p>
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
                  <div className="pointer-events-none h-28 w-28 overflow-hidden rounded-2xl border border-border-light/60 bg-white shadow-card">
                    {mainSummary.image ? (
                      <img
                        src={mainSummary.image}
                        alt={`${mainSummary.title} 이미지`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-primary/70">
                        <span className="material-symbols-outlined text-3xl">directions_car</span>
                        <p className="text-[10px] font-semibold">차량 이미지 없음</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-subtext-light">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
                <span className="material-symbols-outlined text-base">person</span>
                <span>소유자 {mainSummary.owner}</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-border-light/60 px-3 py-1 font-semibold text-text-light">
                <span className="material-symbols-outlined text-base">category</span>
                <span>{mainSummary.vehicleType}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {mainSummary.chips.map((chip) => (
            <div
              key={chip.label}
              className="flex items-center gap-3 rounded-xl border border-border-light bg-background-light px-3 py-3"
            >
              <span className="material-symbols-outlined flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                {chip.icon}
              </span>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-subtext-light">{chip.label}</p>
                <p className="text-sm font-semibold text-text-light">{chip.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-primary">info</span>
          <h2 className="text-base font-semibold text-text-light">기본 정보</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {baseInfoItems.map((item) => (
            <InfoItem key={item.label} label={item.label} value={item.value} icon={item.icon} />
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
                aria-expanded={!detailFold.insurance}
                aria-label={detailFold.insurance ? "보험 정보 펼치기" : "보험 정보 접기"}
              >
                <span className="material-symbols-outlined text-base">
                  {detailFold.insurance ? "expand_more" : "expand_less"}
                </span>
              </button>
            </div>
            {!detailFold.insurance ? (
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
            ) : null}
          </div>

          <div className="rounded-2xl border border-border-light bg-surface-light p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">fact_check</span>
                <h3 className="text-sm font-semibold text-text-light">점검 · 등록 · 세금</h3>
              </div>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border-light bg-background-light text-subtext-light transition hover:text-primary"
                onClick={() =>
                  setDetailFold((prev) => ({ ...prev, inspection: !prev.inspection }))
                }
                aria-expanded={!detailFold.inspection}
                aria-label={detailFold.inspection ? "점검 · 등록 · 세금 펼치기" : "점검 · 등록 · 세금 접기"}
              >
                <span className="material-symbols-outlined text-base">
                  {detailFold.inspection ? "expand_more" : "expand_less"}
                </span>
              </button>
            </div>
            {!detailFold.inspection ? (
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
            ) : null}
          </div>
        </div>
      </section>

      {legalInfo?.memo ? (
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-text-light">메모</h2>
          <div className="rounded-2xl border border-border-light bg-surface-light p-4 text-sm text-text-light shadow-sm">
            {legalInfo.memo}
          </div>
        </section>
      ) : null}
    </div>
  );
}
