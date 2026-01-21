import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/client";
import PanelTabs from "./PanelTabs";

const DEFAULT_FORM = {
  insurance_company: "",
  insurance_number: "",
  insurance_expiry: "",
  insurance_fee: "",
  tax_year: "",
  tax_amount: "",
  tax_due_date: "",
  tax_paid: false,
  inspection_center: "",
  inspection_date: "",
  next_inspection_date: "",
  inspection_result: "",
  registration_number: "",
  registration_office: "",
  registration_date: "",
  registration_type: "",
  memo: "",
};

const SECTION_LABELS = {
  insurance: "보험",
  tax: "자동차세",
  inspection: "정기검사",
  registration: "차량 등록",
  memo: "메모",
  all: "전체 법적 정보" // 기본값 추가
};

const SECTION_FIELDS = {
  insurance: ["insurance_company", "insurance_number", "insurance_expiry", "insurance_fee"],
  tax: ["tax_year", "tax_amount", "tax_due_date", "tax_paid"],
  inspection: ["inspection_center", "inspection_date", "next_inspection_date", "inspection_result"],
  registration: ["registration_number", "registration_office", "registration_date", "registration_type"],
  memo: ["memo"],
};

const TABS = [
  { key: "insurance", label: "보험", icon: "verified_user", description: "보험 증권과 만기 정보를 관리하세요." },
  { key: "tax", label: "자동차세", icon: "receipt_long", description: "자동차세 부과·납부 내역을 기록합니다." },
  { key: "inspection", label: "정기검사", icon: "assignment_turned_in", description: "검사 일정과 결과를 추적하세요." },
  { key: "registration", label: "차량 등록", icon: "badge", description: "등록증 정보를 최신 상태로 유지하세요." },
  { key: "memo", label: "메모", icon: "edit_note", description: "추가로 메모할 내용을 남겨주세요." },
];

const SectionCard = ({ title, description, icon, children }) => (
  <section className="rounded-2xl border border-border-light bg-surface-light shadow-card">
    <header className="flex items-center gap-3 border-b border-border-light px-5 py-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <span className="material-symbols-outlined text-xl">{icon}</span>
      </span>
      <div>
        <h2 className="text-base font-semibold text-text-light">{title}</h2>
        <p className="text-sm text-subtext-light">{description}</p>
      </div>
    </header>
    <div className="space-y-4 px-5 py-5">{children}</div>
  </section>
);

const InputField = ({ label, value, onChange, type = "text", placeholder }) => (
  <label className="flex flex-col gap-2">
    <span className="text-sm font-semibold text-text-light">{label}</span>
    <input
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      type={type}
      placeholder={placeholder}
      className="h-11 rounded-xl border border-border-light bg-background-light px-3 text-sm text-text-light shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
    />
  </label>
);

export default function LegalPanel({ vehicle }) {
  const [viewTab, setViewTab] = useState("summary");
  const [tab, setTab] = useState("insurance");
  const isSummaryView = viewTab === "summary";
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("success");
  const [lastSavedSection, setLastSavedSection] = useState(null);
  const [records, setRecords] = useState([]);
  const [activeRecordId, setActiveRecordId] = useState(null);
  const activeRecordIdRef = useRef(null);

  const loadRecords = async (focusId) => {
    if (!vehicle?.id) {
      setRecords([]);
      setActiveRecordId(null);
      setForm(DEFAULT_FORM);
      return;
    }
    try {
      const res = await api.get("/legal/list", { params: { vehicleId: vehicle.id } });
      const list = Array.isArray(res.data) ? res.data : [];
      setRecords(list);
      
      if (!list.length) {
        setActiveRecordId(null);
        setForm(DEFAULT_FORM);
        return;
      }
      
      const targetId = focusId ?? activeRecordIdRef.current ?? list[0].id;
      const target = list.find((item) => item.id === targetId) || list[0];
      setActiveRecordId(target.id);
      setForm({ ...DEFAULT_FORM, ...target });
    } catch (error) {
      console.error("Error loading records", error);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [vehicle]);

  useEffect(() => {
    activeRecordIdRef.current = activeRecordId;
  }, [activeRecordId]);

  const sectionMeta = useMemo(() => TABS.find((item) => item.key === tab) ?? TABS[0], [tab]);
  const activeRecord = useMemo(
    () => records.find((record) => record.id === activeRecordId) ?? null,
    [records, activeRecordId],
  );

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveData = async (sectionKey = "all") => {
    if (!vehicle) {
      setMessageTone("error");
      setMessage("차량을 먼저 선택해주세요.");
      setLastSavedSection(sectionKey);
      setTimeout(() => setMessage(""), 2000);
      return;
    }

    try {
      setLoading(true);
      setLastSavedSection(sectionKey);
      const basePayload = {
        user_id: vehicle.user_id ?? vehicle.userId ?? null,
        vehicle_id: vehicle.id,
        tax_paid: Boolean(form.tax_paid),
      };
      const selectedFields = SECTION_FIELDS[sectionKey] || null;
      const payload = selectedFields
        ? selectedFields.reduce((acc, key) => ({ ...acc, [key]: form[key] }), { ...basePayload })
        : { ...basePayload, ...form };

      let response;
      if (form.id) {
        response = await api.put(`/legal/update/${form.id}`, { ...payload, id: form.id });
      } else {
        response = await api.post(`/legal/add`, payload);
      }

      const savedRecord = response?.data || response;
      await loadRecords(savedRecord?.id ?? form.id);

      const label = SECTION_LABELS[sectionKey] || "법적 정보";
      setMessageTone("success");
      setMessage(`${label} 정보가 저장되었습니다.`);
    } catch (error) {
      setMessageTone("error");
      setMessage("저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 2500);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!recordId) return;
    const ok = window.confirm("이 기록을 삭제하시겠습니까?");
    if (!ok) return;
    try {
      setLoading(true);
      await api.delete(`/legal/delete/${recordId}`);
      setMessageTone("success");
      setMessage("저장된 기록이 삭제되었습니다.");
      setLastSavedSection("records");
      await loadRecords();
    } catch (error) {
      setMessageTone("error");
      setMessage("삭제 중 오류가 발생했습니다.");
      setLastSavedSection("records");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 2500);
    }
  };

  const summaryCards = useMemo(() => {
    const source = activeRecord ?? form;
    const insuranceSubtitle = source.insurance_company || "보험사 미등록";
    const insuranceDetail = source.insurance_expiry ? `만기 ${source.insurance_expiry}` : "만기일 미등록";
    const taxSubtitle = source.tax_year ? `${source.tax_year}년 자동차세` : "과세 연도 미등록";
    const taxDetail = source.tax_due_date ? `납부 기한 ${source.tax_due_date}` : "납부 기한 미등록";
    const inspectionSubtitle = source.inspection_center || "검사소 미등록";
    const inspectionDetail = source.next_inspection_date
      ? `다음 검사 ${source.next_inspection_date}`
      : source.inspection_date
      ? `검사일 ${source.inspection_date}`
      : "검사 일정 미등록";
    const registrationSubtitle = source.registration_number || "등록 번호 미등록";
    const registrationDetail = source.registration_date ? `등록일 ${source.registration_date}` : "등록일 미등록";

    return [
      { key: "insurance", label: "보험", icon: "verified_user", subtitle: insuranceSubtitle, detail: insuranceDetail, color: "bg-sky-100 text-sky-700" },
      { key: "tax", label: "자동차세", icon: "receipt_long", subtitle: taxSubtitle, detail: taxDetail, color: "bg-amber-100 text-amber-700" },
      { key: "inspection", label: "정기검사", icon: "assignment_turned_in", subtitle: inspectionSubtitle, detail: inspectionDetail, color: "bg-emerald-100 text-emerald-700" },
      { key: "registration", label: "차량 등록", icon: "badge", subtitle: registrationSubtitle, detail: registrationDetail, color: "bg-indigo-100 text-indigo-700" },
    ];
  }, [activeRecord, form]);

  const renderInsurance = () => (
    <div className="grid gap-4 sm:grid-cols-2">
      <InputField label="보험사" value={form.insurance_company} onChange={(v) => updateField("insurance_company", v)} placeholder="예: 카케어손보" />
      <InputField label="증권번호" value={form.insurance_number} onChange={(v) => updateField("insurance_number", v)} placeholder="예: 123456789" />
      <InputField label="만기일" type="date" value={form.insurance_expiry} onChange={(v) => updateField("insurance_expiry", v)} />
      <InputField label="보험료" value={form.insurance_fee} onChange={(v) => updateField("insurance_fee", v)} placeholder="예: 120000" />
      <div className="sm:col-span-2 flex justify-end">
        <button type="button" onClick={() => saveData("insurance")} disabled={loading} className={`rounded-full px-4 py-2 text-sm font-semibold text-white ${loading ? "bg-primary/40" : "bg-primary hover:bg-primary/90"}`}>
          보험 정보 저장
        </button>
      </div>
      {message && lastSavedSection === "insurance" && (
        <p className={`sm:col-span-2 text-right text-xs ${messageTone === "success" ? "text-emerald-600" : "text-red-600"}`}>{message}</p>
      )}
    </div>
  );

  const renderTax = () => (
    <div className="grid gap-4 sm:grid-cols-2">
      <InputField label="과세 연도" value={form.tax_year} onChange={(v) => updateField("tax_year", v)} placeholder="예: 2024" />
      <InputField label="세액" value={form.tax_amount} onChange={(v) => updateField("tax_amount", v)} placeholder="예: 240000" />
      <InputField label="납부 기한" type="date" value={form.tax_due_date} onChange={(v) => updateField("tax_due_date", v)} />
      <label className="flex items-center gap-2 text-sm font-semibold text-text-light">
        <input type="checkbox" checked={form.tax_paid} onChange={(e) => updateField("tax_paid", e.target.checked)} className="h-4 w-4 rounded border-border-light text-primary" />
        납부 완료
      </label>
      <div className="sm:col-span-2 flex justify-end">
        <button type="button" onClick={() => saveData("tax")} disabled={loading} className={`rounded-full px-4 py-2 text-sm font-semibold text-white ${loading ? "bg-primary/40" : "bg-primary hover:bg-primary/90"}`}>
          자동차세 정보 저장
        </button>
      </div>
      {message && lastSavedSection === "tax" && (
        <p className={`sm:col-span-2 text-right text-xs ${messageTone === "success" ? "text-emerald-600" : "text-red-600"}`}>{message}</p>
      )}
    </div>
  );

  const renderInspection = () => (
    <div className="grid gap-4 sm:grid-cols-2">
      <InputField label="검사소" value={form.inspection_center} onChange={(v) => updateField("inspection_center", v)} placeholder="예: 카케어 자동차 검사소" />
      <InputField label="검사일" type="date" value={form.inspection_date} onChange={(v) => updateField("inspection_date", v)} />
      <InputField label="다음 검사일" type="date" value={form.next_inspection_date} onChange={(v) => updateField("next_inspection_date", v)} />
      <InputField label="결과/메모" value={form.inspection_result} onChange={(v) => updateField("inspection_result", v)} />
      <div className="sm:col-span-2 flex justify-end">
        <button type="button" onClick={() => saveData("inspection")} disabled={loading} className={`rounded-full px-4 py-2 text-sm font-semibold text-white ${loading ? "bg-primary/40" : "bg-primary hover:bg-primary/90"}`}>
          검사 정보 저장
        </button>
      </div>
      {message && lastSavedSection === "inspection" && (
        <p className={`sm:col-span-2 text-right text-xs ${messageTone === "success" ? "text-emerald-600" : "text-red-600"}`}>{message}</p>
      )}
    </div>
  );

  const renderRegistration = () => (
    <div className="grid gap-4 sm:grid-cols-2">
      <InputField label="등록 번호" value={form.registration_number} onChange={(v) => updateField("registration_number", v)} />
      <InputField label="등록 기관" value={form.registration_office} onChange={(v) => updateField("registration_office", v)} />
      <InputField label="등록일" type="date" value={form.registration_date} onChange={(v) => updateField("registration_date", v)} />
      <InputField label="등록 유형" value={form.registration_type} onChange={(v) => updateField("registration_type", v)} />
      <div className="sm:col-span-2 flex justify-end">
        <button type="button" onClick={() => saveData("registration")} disabled={loading} className={`rounded-full px-4 py-2 text-sm font-semibold text-white ${loading ? "bg-primary/40" : "bg-primary hover:bg-primary/90"}`}>
          등록 정보 저장
        </button>
      </div>
      {message && lastSavedSection === "registration" && (
        <p className={`sm:col-span-2 text-right text-xs ${messageTone === "success" ? "text-emerald-600" : "text-red-600"}`}>{message}</p>
      )}
    </div>
  );

  const renderMemo = () => (
    <div className="space-y-4">
      <textarea
        value={form.memo ?? ""}
        onChange={(e) => updateField("memo", e.target.value)}
        rows={6}
        className="w-full rounded-xl border border-border-light bg-background-light px-3 py-3 text-sm focus:border-primary focus:outline-none"
        placeholder="메모를 입력하세요."
      />
      <div className="flex justify-end">
        <button type="button" onClick={() => saveData("memo")} disabled={loading} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
          메모 저장
        </button>
      </div>
      {message && lastSavedSection === "memo" && (
        <p className={`text-right text-xs ${messageTone === "success" ? "text-emerald-600" : "text-red-600"}`}>{message}</p>
      )}
    </div>
  );

  const renderSection = () => {
    switch (tab) {
      case "insurance": return renderInsurance();
      case "tax": return renderTax();
      case "inspection": return renderInspection();
      case "registration": return renderRegistration();
      case "memo": return renderMemo();
      default: return null;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background-light text-text-light pb-2">
      <PanelTabs
        tabs={[
          { key: "summary", label: "요약보기", icon: "insights" },
          { key: "details", label: "상세보기", icon: "list_alt" },
        ]}
        activeKey={viewTab}
        onChange={setViewTab}
      />
      <div className="space-y-6 px-4 py-6">
        {isSummaryView ? (
          <>
            <section className="rounded-2xl border border-border-light bg-surface-light p-5 shadow-card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <span className="material-symbols-outlined text-xl">gavel</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-subtext-light">차량 법적 정보</p>
                    <h1 className="mt-1 text-xl font-bold text-text-light">{vehicle?.maker} {vehicle?.model}</h1>
                    <p className="text-sm text-subtext-light">차량 번호: {vehicle?.plate_no ?? "정보 없음"}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end text-right text-sm text-subtext-light">
                  <span className="font-semibold text-text-light">상태</span>
                  <span>{message && messageTone === "success" ? "방금 저장됨" : "확인 필요"}</span>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3">
              {summaryCards.map((card) => (
                <div
                  key={card.key}
                  className="flex flex-col gap-3 rounded-2xl border border-border-light bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full ${card.color}`}>
                      <span className="material-symbols-outlined text-lg">{card.icon}</span>
                    </span>
                    <span className="text-sm font-semibold text-text-light">{card.label}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-light">{card.subtitle}</p>
                    <p className="text-xs text-subtext-light">{card.detail}</p>
                  </div>
                </div>
              ))}
            </section>
          </>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {TABS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${tab === item.key ? "bg-primary text-white shadow" : "bg-surface-light text-subtext-light border border-border-light"}`}
                >
                  <span className="material-symbols-outlined text-base">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>

            <SectionCard title={sectionMeta.label} description={sectionMeta.description} icon={sectionMeta.icon}>
              {renderSection()}
            </SectionCard>

            {records.length > 0 ? (
              <section className="space-y-4 rounded-2xl border border-border-light bg-surface-light p-5 shadow-card">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-text-light">저장된 기록</h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!activeRecordId) return;
                        const target = records.find((record) => record.id === activeRecordId);
                        if (target) {
                          setForm({ ...DEFAULT_FORM, ...target });
                        }
                      }}
                      disabled={!activeRecordId}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border-light text-subtext-light transition hover:text-primary disabled:opacity-50"
                      aria-label="선택 기록 수정"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRecord(activeRecordId)}
                      disabled={!activeRecordId || loading}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      aria-label="선택 기록 삭제"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                    <button
                      onClick={() => loadRecords()}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border-light text-subtext-light transition hover:text-primary"
                      aria-label="저장된 기록 새로고침"
                    >
                      <span className="material-symbols-outlined text-base">refresh</span>
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {records.map((record) => (
                    <button
                      key={record.id}
                      onClick={() => {
                        setActiveRecordId(record.id);
                        setForm({ ...DEFAULT_FORM, ...record });
                      }}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${activeRecordId === record.id ? "border-primary bg-primary/5" : "border-border-light bg-white"}`}
                    >
                      <div className="flex justify-between items-center gap-3">
                        <div className="text-sm">
                          <p className="font-semibold">{record.insurance_company || "기록 정보"}</p>
                          <p className="text-xs text-subtext-light">만기: {record.insurance_expiry || "-"}</p>
                        </div>
                        {activeRecordId === record.id && <span className="text-xs font-semibold text-primary">선택됨</span>}
                      </div>
                    </button>
                  ))}
                </div>
                {message && lastSavedSection === "records" && (
                  <p className={`text-right text-xs ${messageTone === "success" ? "text-emerald-600" : "text-red-600"}`}>{message}</p>
                )}
              </section>
            ) : (
              <p className="text-center text-sm text-subtext-light">저장된 기록이 없습니다.</p>
            )}
          </>
        )}
      </div>

    </div>
  );
}
