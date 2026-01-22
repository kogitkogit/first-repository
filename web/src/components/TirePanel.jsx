import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import PanelTabs from "./PanelTabs";

const POSITIONS = [
  { key: "front_left", label: "전륜(좌)", short: "FL" },
  { key: "front_right", label: "전륜(우)", short: "FR" },
  { key: "rear_left", label: "후륜(좌)", short: "RL" },
  { key: "rear_right", label: "후륜(우)", short: "RR" },
];

const POSITION_STYLES = {
  front_left: { top: "12%", left: "-18%" },
  front_right: { top: "12%", right: "-18%" },
  rear_left: { bottom: "12%", left: "-18%" },
  rear_right: { bottom: "12%", right: "-18%" },
};

const STATUS_RING = {
  ok: "border-emerald-400",
  warning: "border-amber-400",
  critical: "border-red-500",
};

const STATUS_BADGE = {
  ok: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
};

const STATUS_LABEL = {
  ok: "정상",
  warning: "점검 필요",
  critical: "위험",
};

const SERVICE_TYPE_LABEL = {
  replacement: "교차",
  rotation: "로테이션",
  alignment: "얼라인먼트",
  inspection: "점검",
};

const INPUT_CLASS =
  "block w-full rounded-xl border border-border-light bg-background-light px-3 py-2 text-sm text-text-light placeholder:text-subtext-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";
const PRIMARY_BUTTON_CLASS =
  "inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary/90 disabled:opacity-60";
const SECONDARY_BUTTON_CLASS =
  "inline-flex items-center justify-center rounded-xl border border-border-light bg-surface-light px-4 py-2 text-sm font-semibold text-subtext-light transition hover:text-text-light disabled:opacity-60";

const emptyMeasurementForm = () => ({
  measured_at: toDateTimeLocalString(new Date()),
  pressure_kpa: "",
  tread_depth_mm: "",
  temperature_c: "",
});

const emptyMetaForm = () => ({
  brand: "",
  model: "",
  size: "",
  installed_at: "",
  installed_odo: "",
  recommended_pressure_min: "",
  recommended_pressure_max: "",
});

const emptyServiceForm = (vehicle, type) => ({
  performed_at: new Date().toISOString().slice(0, 10),
  odo_km: vehicle?.odo_km ? String(vehicle.odo_km) : "",
  provider: "",
  cost: "",
  pattern: type === "alignment" ? "얼라인먼트" : type === "rotation" ? "로테이션" : "",
});

function toDateTimeLocalString(date) {
  if (!date) return "";
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

function toFloat(value) {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toInt(value) {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

export default function TirePanel({ vehicle }) {
  const [summary, setSummary] = useState(null);
  const [selected, setSelected] = useState(POSITIONS[0].key);
  const [history, setHistory] = useState({ measurements: [], services: [] });
  const [metaForm, setMetaForm] = useState(() => emptyMetaForm());
  const [metaEditing, setMetaEditing] = useState(false);
  const [measurementForm, setMeasurementForm] = useState(() => emptyMeasurementForm());
  const [measurementModalOpen, setMeasurementModalOpen] = useState(false);
  const [serviceModal, setServiceModal] = useState({ open: false, type: null });
  const [serviceForm, setServiceForm] = useState(() => emptyServiceForm(vehicle, "rotation"));
  const [serviceLog, setServiceLog] = useState([]);
  const [viewTab, setViewTab] = useState("summary");
  const [historyTab, setHistoryTab] = useState("measurements");
  const [loading, setLoading] = useState(false);

  const selectedSummary = useMemo(() => {
    if (!summary) return null;
    return summary.tires.find((item) => item.position === selected) ?? null;
  }, [summary, selected]);

  const selectedLabel = useMemo(() => {
    if (selectedSummary?.position_label) return selectedSummary.position_label;
    return POSITIONS.find((item) => item.key === selected)?.label || "선택된 타이어 없음";
  }, [selected, selectedSummary?.position_label]);

  useEffect(() => {
    if (!vehicle) return;
    fetchSummary();
    fetchHistory(selected);
    fetchServiceLog();
  }, [vehicle?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [vehicle?.id, viewTab]);

  useEffect(() => {
    if (!vehicle) return;
    fetchHistory(selected);
  }, [selected, vehicle?.id]);

  useEffect(() => {
    if (selectedSummary && !metaEditing) {
      setMetaForm({
        brand: selectedSummary.brand ?? "",
        model: selectedSummary.model ?? "",
        size: selectedSummary.size ?? "",
        installed_at: selectedSummary.installed_at ?? "",
        installed_odo: selectedSummary.installed_odo ?? "",
        recommended_pressure_min: selectedSummary.recommended_pressure_min ?? "",
        recommended_pressure_max: selectedSummary.recommended_pressure_max ?? "",
      });
    }
  }, [selectedSummary, metaEditing]);

  const fetchSummary = async () => {
    try {
      const { data } = await api.get("/tires/summary", {
        params: { vehicleId: vehicle.id },
      });
      setSummary(data);
      setServiceLog(data.recent_services || []);
      if (!data.tires.some((item) => item.position === selected)) {
        setSelected(POSITIONS[0].key);
      }
    } catch (error) {
      console.error("Failed to load tire summary", error);
    }
  };

  const fetchHistory = async (positionKey) => {
    if (!vehicle) return;
    try {
      const { data } = await api.get(`/tires/${positionKey}/history`, {
        params: { vehicleId: vehicle.id },
      });
      setHistory(data);
    } catch (error) {
      console.error("Failed to load tire history", error);
    }
  };

  const fetchServiceLog = async () => {
    if (!vehicle) return;
    try {
      const { data } = await api.get("/tires/services", {
        params: { vehicleId: vehicle.id, limit: 20 },
      });
      setServiceLog(data);
    } catch (error) {
      console.error("Failed to load tire services", error);
    }
  };

  const handleMetaSave = async () => {
    if (!vehicle) return;
    setLoading(true);
    try {
      const payload = {
        brand: metaForm.brand || undefined,
        model: metaForm.model || undefined,
        size: metaForm.size || undefined,
        installed_at: metaForm.installed_at || undefined,
        installed_odo: toInt(metaForm.installed_odo),
        recommended_pressure_min: toFloat(metaForm.recommended_pressure_min),
        recommended_pressure_max: toFloat(metaForm.recommended_pressure_max),
      };
      await api.put(`/tires/${selected}`, payload, {
        params: { vehicleId: vehicle.id },
      });
      await fetchSummary();
      setMetaEditing(false);
    } catch (error) {
      console.error("Failed to update tire", error);
      alert("타이어 정보를 저장하지 못했습니다. 자세한 내용은 콘솔을 확인하세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleMeasurementSave = async () => {
    if (!vehicle) return;
    setLoading(true);
    try {
      const measuredAt = measurementForm.measured_at
        ? new Date(measurementForm.measured_at)
        : new Date();
      const payload = {
        measured_at: measuredAt.toISOString(),
        pressure_kpa: toFloat(measurementForm.pressure_kpa),
        tread_depth_mm: toFloat(measurementForm.tread_depth_mm),
        temperature_c: toFloat(measurementForm.temperature_c),
      };
      await api.post(`/tires/${selected}/measurements`, payload, {
        params: { vehicleId: vehicle.id },
      });
      await Promise.all([fetchSummary(), fetchHistory(selected)]);
      setMeasurementModalOpen(false);
      setMeasurementForm(emptyMeasurementForm());
    } catch (error) {
      console.error("Failed to save measurement", error);
      alert("계측값을 저장하지 못했습니다. 자세한 내용은 콘솔을 확인하세요.");
    } finally {
      setLoading(false);
    }
  };

  const openServiceModal = (type) => {
    setServiceModal({ open: true, type });
    setServiceForm(emptyServiceForm(vehicle, type));
  };

  const handleServiceSave = async () => {
    if (!vehicle || !serviceModal.type) return;
    if (!serviceForm.performed_at) {
      alert("서비스 날짜를 입력해야 합니다.");
      return;
    }
    setLoading(true);
    try {
      if (serviceModal.type === "replacement") {
        const payload = {
          performed_at: serviceForm.performed_at,
          odo_km: toInt(serviceForm.odo_km),
          provider: serviceForm.provider || undefined,
          cost: toInt(serviceForm.cost),
        };
        await api.post(`/tires/${selected}/replacement`, payload, {
          params: { vehicleId: vehicle.id },
        });
        await Promise.all([fetchSummary(), fetchHistory(selected), fetchServiceLog()]);
      } else {
        const payload = {
          vehicle_id: vehicle.id,
          performed_at: serviceForm.performed_at,
          odo_km: toInt(serviceForm.odo_km),
          pattern:
            serviceModal.type === "alignment"
              ? "얼라인먼트"
              : serviceModal.type === "rotation"
              ? "로테이션"
              : undefined,
          provider: serviceForm.provider || undefined,
          cost: toInt(serviceForm.cost),
        };
        await api.post("/tires/rotation", payload);
        await fetchServiceLog();
        await fetchHistory(selected);
      }
      setServiceModal({ open: false, type: null });
      setServiceForm(emptyServiceForm(vehicle, "rotation"));
    } catch (error) {
      console.error("Failed to save service", error);
      alert("서비스 기록을 저장하지 못했습니다. 자세한 내용은 콘솔을 확인하세요.");
    } finally {
      setLoading(false);
    }
  };

  const latestMeasurement = history.measurements?.[0];
  const quickStats = [
    {
      key: "pressure",
      label: "공기압",
      icon: "compress",
      value:
        latestMeasurement?.pressure_kpa != null
          ? `${latestMeasurement.pressure_kpa.toFixed(1)} ${selectedSummary?.pressure_unit ?? "kPa"}`
          : "기록 없음",
      caption: selectedSummary ? `권장: ${renderPressureRange(selectedSummary)}` : null,
    },
    {
      key: "tread",
      label: "트레드 깊이",
      icon: "straighten",
      value:
        latestMeasurement?.tread_depth_mm != null
          ? `${latestMeasurement.tread_depth_mm.toFixed(1)} mm`
          : "기록 없음",
    },
    {
      key: "temperature",
      label: "표면 온도",
      icon: "device_thermostat",
      value:
        latestMeasurement?.temperature_c != null
          ? `${latestMeasurement.temperature_c.toFixed(1)} ℃`
          : "기록 없음",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background-light text-text-light">
      <PanelTabs
        tabs={[
          { key: "summary", label: "요약보기", icon: "insights" },
          { key: "detail", label: "상세보기", icon: "list_alt" },
        ]}
        activeKey={viewTab}
        onChange={setViewTab}
      />
      <div className="space-y-6 px-4 pb-24">
        {viewTab === "summary" ? (
          <>
            <section className="rounded-2xl border border-border-light bg-surface-light p-5 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase text-subtext-light">선택된 타이어</p>
                  <h2 className="text-lg font-semibold text-text-light">{selectedSummary?.position_label ?? "타이어"}</h2>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE[selectedSummary?.status ?? "ok"]}`}>
                  {STATUS_LABEL[selectedSummary?.status ?? "ok"]}
                </span>
              </div>
              <p className="mt-2 text-sm text-subtext-light">
                아래에서 확인할 타이어를 스와이프하거나 탭하세요.
              </p>
              <div className="mt-6 relative mx-auto h-64 max-w-xs rounded-[3rem] border border-border-light bg-background-light">
                <div className="absolute inset-8 rounded-[2.5rem] bg-border-light/50" />
                <div className="absolute inset-y-8 left-1/2 w-12 -translate-x-1/2 rounded-full bg-border-light/70" />
                {POSITIONS.map((pos) => {
                  const item = summary?.tires.find((t) => t.position === pos.key);
                  const status = item?.status ?? "ok";
                  const ring = STATUS_RING[status] ?? STATUS_RING.ok;
                  const isActive = selected === pos.key;
                  return (
                    <button
                      key={pos.key}
                      type="button"
                      style={POSITION_STYLES[pos.key]}
                      onClick={() => setSelected(pos.key)}
                      className={`absolute flex flex-col items-center transition-transform ${isActive ? "scale-125" : "scale-100"}`}
                    >
                      <span
                        className={`flex ${isActive ? "h-16 w-16 border-[5px]" : "h-12 w-12 border-4"} items-center justify-center rounded-full bg-white text-base font-bold text-slate-800 shadow ${ring}`}
                      >
                        {pos.short}
                      </span>
                      <span className="mt-1 text-[11px] font-semibold text-text-light">{pos.label}</span>
                      {item?.last_measurement?.pressure_kpa != null && (
                        <span className="mt-0.5 text-[10px] text-subtext-light">
                          {item.last_measurement.pressure_kpa.toFixed(1)} kPa
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-border-light bg-surface-light p-5 shadow-card space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase text-subtext-light">최근 계측값</p>
                <p className="text-sm text-subtext-light">가장 최근에 저장한 공기압, 트레드, 온도를 확인하세요.</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {quickStats.map((stat) => (
                  <div key={stat.key} className="rounded-2xl border border-border-light bg-background-light p-4 text-left shadow-sm">
                    <div className="flex items-center gap-2 text-subtext-light">
                      <span className="material-symbols-outlined text-base text-primary">{stat.icon}</span>
                      <span className="text-xs font-semibold uppercase tracking-wide">{stat.label}</span>
                    </div>
                    <p className="mt-2 text-xl font-bold text-text-light">{stat.value}</p>
                    {stat.caption ? <p className="text-xs text-subtext-light">{stat.caption}</p> : null}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-subtext-light">측정값은 최신 기록을 기준으로 계산됩니다.</p>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
                  onClick={() => {
                    setMeasurementForm(emptyMeasurementForm());
                    setMeasurementModalOpen(true);
                  }}
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  측정값 기록
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-border-light bg-surface-light p-5 shadow-card">
              <h3 className="text-base font-semibold text-text-light">서비스 작업</h3>
              <p className="text-sm text-subtext-light">교체 이력과 정비소 방문을 등록하세요.</p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <ActionButton label="교차" onClick={() => openServiceModal("replacement")} />
                <ActionButton label="로테이션" onClick={() => openServiceModal("rotation")} />
                <ActionButton label="얼라인먼트" onClick={() => openServiceModal("alignment")} />
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="rounded-2xl border border-border-light bg-surface-light p-5 shadow-card space-y-4">
              <header className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-text-light">기본 정보</h3>
                  <p className="text-sm text-subtext-light">브랜드, 사이즈, 장착 정보와 목표치를 관리하세요.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <select
                      className="appearance-none rounded-full border border-border-light bg-primary/10 py-1 pl-3 pr-8 text-xs font-semibold text-primary transition hover:bg-primary/20"
                      value={selected}
                      onChange={(e) => setSelected(e.target.value)}
                      aria-label="타이어 위치 선택"
                    >
                      {POSITIONS.map((item) => (
                        <option key={item.key} value={item.key}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary">
                      v
                    </span>
                  </div>
                </div>
              </header>

              {!metaEditing ? (
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <InfoRow label="브랜드" value={selectedSummary?.brand || "-"} />
                  <InfoRow label="모델" value={selectedSummary?.model || "-"} />
                  <InfoRow label="사이즈" value={selectedSummary?.size || "-"} />
                  <InfoRow label="장착일" value={selectedSummary?.installed_at || "-"} />
                  <InfoRow
                    label="장착 시 주행거리"
                    value={selectedSummary?.installed_odo != null ? `${selectedSummary.installed_odo.toLocaleString()} km` : "-"}
                  />
                  <InfoRow label="권장 공기압" value={renderPressureRange(selectedSummary)} />
                  {selectedSummary?.warnings?.length ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                      <p className="font-semibold">알림</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5">
                        {selectedSummary.warnings.map((warning, idx) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3">
                    <input className={INPUT_CLASS} placeholder="브랜드" value={metaForm.brand} onChange={(e) => setMetaForm((prev) => ({ ...prev, brand: e.target.value }))} />
                    <input className={INPUT_CLASS} placeholder="모델" value={metaForm.model} onChange={(e) => setMetaForm((prev) => ({ ...prev, model: e.target.value }))} />
                    <input className={INPUT_CLASS} placeholder="사이즈 (예: 225/45R17)" value={metaForm.size} onChange={(e) => setMetaForm((prev) => ({ ...prev, size: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" className={INPUT_CLASS} value={metaForm.installed_at} onChange={(e) => setMetaForm((prev) => ({ ...prev, installed_at: e.target.value }))} />
                    <input type="number" className={INPUT_CLASS} placeholder="장착 시 주행거리" value={metaForm.installed_odo} onChange={(e) => setMetaForm((prev) => ({ ...prev, installed_odo: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" step="0.1" className={INPUT_CLASS} placeholder="최소 공기압 (kPa)" value={metaForm.recommended_pressure_min} onChange={(e) => setMetaForm((prev) => ({ ...prev, recommended_pressure_min: e.target.value }))} />
                    <input type="number" step="0.1" className={INPUT_CLASS} placeholder="최대 공기압 (kPa)" value={metaForm.recommended_pressure_max} onChange={(e) => setMetaForm((prev) => ({ ...prev, recommended_pressure_max: e.target.value }))} />
                  </div>
                  <div className="flex gap-3">
                    <button disabled={loading} className={PRIMARY_BUTTON_CLASS} onClick={handleMetaSave} type="button">
                      변경사항 저장
                    </button>
                    <button
                      type="button"
                      className={`${SECONDARY_BUTTON_CLASS} min-w-[92px] whitespace-nowrap`}
                      onClick={() => {
                        setMetaEditing(false);
                        setMetaForm(emptyMetaForm());
                      }}
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="rounded-2xl border border-border-light bg-surface-light p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-text-light">기록</h3>
                  <div className="flex rounded-full border border-border-light p-1 text-xs font-semibold">
                    <button
                      className={`px-3 py-1 rounded-full ${historyTab === "measurements" ? "bg-primary text-white" : "text-subtext-light"}`}
                      onClick={() => setHistoryTab("measurements")}
                    >
                      계측값
                    </button>
                    <button
                      className={`px-3 py-1 rounded-full ${historyTab === "services" ? "bg-primary text-white" : "text-subtext-light"}`}
                      onClick={() => setHistoryTab("services")}
                    >
                      서비스
                    </button>
                  </div>
                </div>

                {historyTab === "measurements" ? (
                  history.measurements?.length ? (
                    <div className="mt-4 space-y-3">
                      {history.measurements.map((row) => (
                        <HistoryCard
                          key={row.id}
                          title={new Date(row.measured_at).toLocaleString()}
                          lines={[
                            { label: "공기압", value: row.pressure_kpa != null ? `${row.pressure_kpa.toFixed(1)} kPa` : "-" },
                            { label: "트레드", value: row.tread_depth_mm != null ? `${row.tread_depth_mm.toFixed(1)} mm` : "-" },
                            { label: "온도", value: row.temperature_c != null ? `${row.temperature_c.toFixed(1)} degC` : "-" },
                          ]}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-subtext-light">계측값 기록이 없습니다.</p>
                  )
                ) : serviceLog?.length ? (
                  <div className="mt-4 space-y-3">
                    {serviceLog.map((row) => (
                      <HistoryCard
                        key={row.id}
                        title={`${SERVICE_TYPE_LABEL[row.service_type] || row.service_type} · ${row.performed_at}`}
                        lines={[
                          { label: "주행거리", value: row.odo_km != null ? `${row.odo_km.toLocaleString()} km` : "-" },
                          { label: "정비업체", value: row.provider || "-" },
                          { label: "비용", value: row.cost != null ? `${row.cost.toLocaleString()} 원` : "-" },
                        ]}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-subtext-light">서비스 기록이 없습니다.</p>
                )}
              </div>
            </section>
          </>
        )}

        {measurementModalOpen ? (
          <Modal
            title="계측값 기록"
            on닫기={() => setMeasurementModalOpen(false)}
            actions={
              <div className="flex flex-col gap-3">
                <button disabled={loading} className={PRIMARY_BUTTON_CLASS} onClick={handleMeasurementSave}>
                  계측값 저장
                </button>
                <button className={SECONDARY_BUTTON_CLASS} onClick={() => setMeasurementModalOpen(false)}>
                  취소
                </button>
              </div>
            }
          >
            <div className="space-y-3">
              <input type="datetime-local" className={INPUT_CLASS} value={measurementForm.measured_at} onChange={(e) => setMeasurementForm((prev) => ({ ...prev, measured_at: e.target.value }))} required />
              <input type="number" step="0.1" className={INPUT_CLASS} placeholder="공기압 (kPa)" value={measurementForm.pressure_kpa} onChange={(e) => setMeasurementForm((prev) => ({ ...prev, pressure_kpa: e.target.value }))} />
              <input type="number" step="0.1" className={INPUT_CLASS} placeholder="트레드 깊이 (mm)" value={measurementForm.tread_depth_mm} onChange={(e) => setMeasurementForm((prev) => ({ ...prev, tread_depth_mm: e.target.value }))} />
              <input type="number" step="0.1" className={INPUT_CLASS} placeholder="온도 (degC)" value={measurementForm.temperature_c} onChange={(e) => setMeasurementForm((prev) => ({ ...prev, temperature_c: e.target.value }))} />
            </div>
          </Modal>
        ) : null}

        {serviceModal.open ? (
          <Modal
            title={serviceModal.type === "replacement" ? "교차 기록" : serviceModal.type === "alignment" ? "얼라인먼트 기록" : "로테이션 기록"}
            on닫기={() => setServiceModal({ open: false, type: null })}
            actions={
              <div className="flex flex-col gap-3">
                <button disabled={loading} className={PRIMARY_BUTTON_CLASS} onClick={handleServiceSave}>
                  서비스 저장
                </button>
                <button className={SECONDARY_BUTTON_CLASS} onClick={() => setServiceModal({ open: false, type: null })}>
                  취소
                </button>
              </div>
            }
          >
            <div className="space-y-3">
              <input type="date" className={INPUT_CLASS} value={serviceForm.performed_at} onChange={(e) => setServiceForm((prev) => ({ ...prev, performed_at: e.target.value }))} required />
              <input type="number" className={INPUT_CLASS} placeholder="주행거리" value={serviceForm.odo_km} onChange={(e) => setServiceForm((prev) => ({ ...prev, odo_km: e.target.value }))} />
              <input className={INPUT_CLASS} placeholder="정비업체" value={serviceForm.provider} onChange={(e) => setServiceForm((prev) => ({ ...prev, provider: e.target.value }))} />
              <input type="number" className={INPUT_CLASS} placeholder="비용" value={serviceForm.cost} onChange={(e) => setServiceForm((prev) => ({ ...prev, cost: e.target.value }))} />
              {serviceModal.type === "replacement" ? (
                <p className="text-xs text-subtext-light">
                  교체 기록은 현재 기본 정보를 함께 저장합니다. 필요하다면 먼저 기본 정보를 업데이트하세요.
                </p>
              ) : null}
            </div>
          </Modal>
        ) : null}
      </div>
    </div>
  );
}

function InfoRow({ label, value, compact }) {
  return (
    <div className={compact ? "space-y-0.5" : "space-y-1"}>
      <p className="text-[11px] uppercase tracking-wide text-subtext-light">{label}</p>
      <p className="text-sm font-semibold text-text-light">{value || "-"}</p>
    </div>
  );
}

function ActionButton({ label, onClick }) {
  return (
    <button
      className="rounded-xl border border-border-light bg-background-light px-4 py-3 text-sm font-semibold text-text-light shadow-sm transition hover:border-primary/50"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function HistoryCard({ title, lines }) {
  return (
    <div className="rounded-2xl border border-border-light bg-background-light p-4 text-sm shadow-sm">
      <p className="font-semibold text-text-light">{title}</p>
      <div className="mt-2 space-y-1">
        {lines.map((line, idx) => (
          line.value ? (
            <div key={`${line.label}-${idx}`} className="flex justify-between text-subtext-light">
              <span className="mr-4 text-xs uppercase tracking-wide text-subtext-light">{line.label}</span>
              <span className="text-sm text-text-light">{line.value}</span>
            </div>
          ) : null
        ))}
      </div>
    </div>
  );
}

function Modal({ title, on닫기, children, actions }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-surface-light p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-light">{title}</h2>
          <button className="text-subtext-light" onClick={on닫기} aria-label="대화 상자 닫기">
            닫기
          </button>
        </div>
        <div className="mt-4 space-y-3">{children}</div>
        <div className="mt-6">{actions}</div>
      </div>
    </div>
  );
}

function renderPressureRange(item) {
  if (!item?.recommended_pressure_min) return "-";
  const min = item.recommended_pressure_min;
  const max = item.recommended_pressure_max;
  if (!max || max === min) {
    return `${min}${item.pressure_unit || "kPa"}`;
  }
  return `${min}${item.pressure_unit || "kPa"} - ${max}${item.pressure_unit || "kPa"}`;
}
