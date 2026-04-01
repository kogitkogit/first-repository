import { useEffect, useState } from "react";

import api from "../api/client";
import { useToast } from "./ui/ToastProvider";

const PRIVACY_POLICY = {
  effectiveDate: "2026-01-23",
  sections: [
    {
      title: "1. 목적",
      body: "CarCare는 이용자의 개인정보를 보호하고 관련 법령을 준수하기 위해 개인정보처리방침을 수립·공개합니다.",
    },
    {
      title: "2. 수집하는 개인정보 항목",
      body: "필수 정보로 이메일, 비밀번호, 차량 정보(차량 번호, 제조사, 모델, 연식, 주행거리 등)를 수집할 수 있으며, 선택 정보로 차량 소유주 이름과 마케팅 수신 여부가 포함될 수 있습니다.",
    },
    {
      title: "3. 수집·이용 목적",
      body: "회원가입 및 본인 확인, 차량 관리와 정비 이력 서비스 제공, 고객 문의 대응을 위해 개인정보를 이용합니다.",
    },
    {
      title: "4. 보관 및 이용 기간",
      body: "회원 탈퇴 시까지 보관하며, 관계 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관합니다.",
    },
    {
      title: "5. 제3자 제공 및 처리 위탁",
      body: "원칙적으로 외부에 제공하지 않으며, 법령 근거 또는 사전 동의가 있는 경우에만 예외적으로 제공될 수 있습니다. 운영상 필요한 위탁이 발생하면 사전 고지 후 진행합니다.",
    },
    {
      title: "6. 이용자 권리",
      body: "이용자는 언제든지 개인정보 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다.",
    },
    {
      title: "7. 안전성 확보 조치",
      body: "접근 통제, 암호화, 내부 관리계획 수립 및 정기 점검을 통해 개인정보를 보호합니다.",
    },
    {
      title: "8. 문의처",
      body: "개인정보 관련 문의는 앱 내 고객 문의 채널을 통해 접수할 수 있습니다.",
    },
  ],
};

function SectionCard({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-border-light bg-surface-light p-5 shadow-card">
      <h3 className="text-lg font-semibold text-text-light">{title}</h3>
      {description ? <p className="mt-1 text-sm text-subtext-light">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InfoButton({ label, value, description, onClick, buttonLabel = "보기" }) {
  return (
    <div className="rounded-2xl border border-border-light bg-background-light/70 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-light">{label}</p>
          {description ? <p className="mt-1 text-xs text-subtext-light">{description}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm font-semibold text-subtext-light">{value}</span>
          {onClick ? (
            <button
              type="button"
              className="rounded-full border border-border-light px-3 py-1 text-xs font-semibold text-subtext-light hover:text-primary"
              onClick={onClick}
            >
              {buttonLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PolicyModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-3xl bg-surface-light shadow-2xl">
        <div className="flex items-center justify-between border-b border-border-light px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-text-light">개인정보처리방침</h3>
            <p className="mt-1 text-xs text-subtext-light">시행일: {PRIVACY_POLICY.effectiveDate}</p>
          </div>
          <button type="button" className="text-subtext-light" onClick={onClose} aria-label="닫기">
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto px-6 py-5">
          {PRIVACY_POLICY.sections.map((section) => (
            <div key={section.title} className="space-y-2">
              <h4 className="text-sm font-semibold text-text-light">{section.title}</h4>
              <p className="text-sm leading-6 text-subtext-light">{section.body}</p>
            </div>
          ))}
          <div className="rounded-2xl border border-border-light bg-background-light px-4 py-3 text-xs leading-5 text-subtext-light">
            원문 기준 문서는 저장소의 <code>docs/privacy_policy.md</code> 에서 관리합니다.
          </div>
        </div>
        <div className="border-t border-border-light px-6 py-4">
          <button
            type="button"
            className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPanel({ userId, vehicle }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [notifications, setNotifications] = useState({ oil: false, filter: false, consumable: false });

  useEffect(() => {
    if (!userId || !vehicle) return;
    setLoading(true);
    setError(null);
    api
      .get("/notifications", { params: { userId, vehicleId: vehicle.id } })
      .then((res) => {
        const oil = res.data.find((item) => item.type === "oil");
        const filter = res.data.find((item) => item.type === "filter");
        const consumable = res.data.find((item) => item.type === "consumable");
        setNotifications({ oil: !!oil?.enabled, filter: !!filter?.enabled, consumable: !!consumable?.enabled });
      })
      .catch((err) => {
        console.error(err);
        setError("알림 설정을 불러오지 못했습니다.");
      })
      .finally(() => setLoading(false));
  }, [userId, vehicle]);

  async function handleToggle(type, nextValue) {
    if (!userId || !vehicle) return;
    setNotifications((prev) => ({ ...prev, [type]: nextValue }));
    try {
      await api.put("/notifications", { user_id: userId, vehicle_id: vehicle.id, type, enabled: nextValue });
      showToast({ tone: "success", message: "알림 설정을 저장했습니다." });
    } catch (error) {
      console.error(error);
      setNotifications((prev) => ({ ...prev, [type]: !nextValue }));
      showToast({ tone: "error", message: "알림 설정 저장에 실패했습니다." });
    }
  }

  if (!userId || !vehicle) {
    return <div className="p-4 text-sm text-subtext-light">차량을 선택한 뒤 다시 시도해주세요.</div>;
  }

  if (loading) {
    return <div className="p-4 text-sm text-subtext-light">설정 정보를 불러오는 중입니다...</div>;
  }

  const toggleItems = [
    { key: "oil", label: "오일 교체 알림", description: "엔진오일과 관련 오일 교체 시점을 안내합니다." },
    { key: "filter", label: "필터 교체 알림", description: "오일 필터, 에어 필터, 에어컨 필터 교체 시점을 안내합니다." },
    { key: "consumable", label: "소모품 알림", description: "브레이크 패드, 배터리 등 주요 소모품 교체 시점을 안내합니다." },
  ];

  return (
    <div className="space-y-6 p-4 pb-28">
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-text-light">설정</h2>
        <p className="text-sm text-subtext-light">알림 기준과 운영 정보를 한 곳에서 관리합니다.</p>
      </div>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

      <SectionCard title="알림 설정" description="필요한 알림만 선택해서 받을 수 있습니다.">
        <div className="divide-y divide-border-light">
          {toggleItems.map((item) => {
            const active = notifications[item.key];
            return (
              <div key={item.key} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-text-light">{item.label}</p>
                  <p className="text-xs text-subtext-light">{active ? "알림이 켜져 있습니다." : "알림이 꺼져 있습니다."} {item.description}</p>
                </div>
                <label className="relative inline-flex items-center">
                  <input type="checkbox" className="peer sr-only" checked={active} onChange={(e) => handleToggle(item.key, e.target.checked)} />
                  <div className="h-6 w-11 rounded-full bg-border-light transition duration-200 peer-checked:bg-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-primary/40" />
                  <div className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform duration-200 peer-checked:translate-x-5" />
                </label>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="운영 정보" description="배포와 운영에 필요한 정보를 정리한 영역입니다.">
        <div className="space-y-3">
          <InfoButton label="앱 버전" value="1.1.0" description="안드로이드 빌드 기준 현재 앱 버전입니다." />
          <InfoButton label="백업" value="준비 중" description="현재 데이터는 Supabase(Postgres)에 저장되며, 앱 내 내보내기 기능은 추후 연결 예정입니다." />
          <InfoButton label="복구" value="준비 중" description="백업 기능과 함께 복구 흐름을 제공할 예정입니다. 현재는 서버 DB 기준으로 관리됩니다." />
          <InfoButton label="개인정보처리방침" value="확인 가능" description="앱 내에서 개인정보처리방침 내용을 바로 확인할 수 있습니다." onClick={() => setPolicyOpen(true)} />
        </div>
      </SectionCard>

      {policyOpen ? <PolicyModal onClose={() => setPolicyOpen(false)} /> : null}
    </div>
  );
}
