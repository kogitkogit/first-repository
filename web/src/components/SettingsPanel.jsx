import { useState } from "react";

const PRIVACY_POLICY_URL = "https://carcare-project.onrender.com/privacy-policy";

const PRIVACY_POLICY = {
  effectiveDate: "2026-04-07",
  sections: [
    {
      title: "1. 개인정보 처리 목적",
      body: "CarCare는 차량 관리 서비스 제공, 기록 저장, 비용 및 정비 분석, 고객 문의 대응을 위해 개인정보를 처리합니다.",
    },
    {
      title: "2. 수집하는 정보",
      body: "차량번호, 제조사, 모델, 연식, 주행거리, 정비 및 주유·충전 기록, 소모품 및 비용 정보 등 사용자가 직접 입력한 차량 관리 정보를 저장합니다.",
    },
    {
      title: "3. 보관 기간",
      body: "회원 계정은 탈퇴 시까지, 비회원 계정은 앱 유지 기간 동안 보관됩니다. 관련 법령에 따른 별도 보관 사유가 있는 경우 해당 기간 동안만 추가 보관합니다.",
    },
    {
      title: "4. 외부 서비스",
      body: "서비스 운영을 위해 Supabase, Render 등 외부 인프라 서비스를 이용할 수 있습니다.",
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

function InfoRow({ label, value, description }) {
  return (
    <div className="rounded-2xl border border-border-light bg-background-light/70 px-4 py-3">
      <p className="text-sm font-semibold text-text-light">{label}</p>
      <p className="mt-1 text-sm font-medium text-subtext-light">{value}</p>
      {description ? <p className="mt-1 text-xs leading-5 text-subtext-light">{description}</p> : null}
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
            공개 URL: <a className="font-semibold text-primary underline" href={PRIVACY_POLICY_URL} target="_blank" rel="noreferrer">{PRIVACY_POLICY_URL}</a>
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

export default function SettingsPanel({ userId, vehicle, username, accountType }) {
  const [policyOpen, setPolicyOpen] = useState(false);

  if (!userId || !vehicle) {
    return <div className="p-4 text-sm text-subtext-light">차량을 선택한 뒤 다시 시도해주세요.</div>;
  }

  const isGuest = accountType === "guest";

  return (
    <div className="space-y-6 p-4 pb-28">
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-text-light">설정</h2>
        <p className="text-sm text-subtext-light">계정 상태와 백업·복구, 개인정보처리방침을 확인할 수 있습니다.</p>
      </div>

      <SectionCard title="계정 정보" description="현재 사용 중인 계정 유형과 복구 가능 여부를 확인하세요.">
        <div className="space-y-3">
          <InfoRow
            label="계정 유형"
            value={isGuest ? "비회원 계정" : "회원 계정"}
            description={isGuest ? "비회원 계정은 빠르게 시작할 수 있지만, 앱 삭제 또는 기기 변경 시 데이터 복구가 어려울 수 있습니다." : "회원 계정은 동일한 계정명과 비밀번호로 다시 로그인해 데이터를 이어서 사용할 수 있습니다."}
          />
          <InfoRow label="계정명" value={username || "-"} description="회원 계정은 로그인에 사용하고, 비회원 계정은 내부 식별용으로 사용됩니다." />
          <InfoRow label="계정 ID" value={String(userId)} description="DB 상 사용자 식별값입니다." />
        </div>
      </SectionCard>

      <SectionCard title="백업 및 복구" description="현재 계정 유형에 따라 복구 가능 범위가 다릅니다.">
        <div className="space-y-3">
          <InfoRow
            label="백업"
            value={isGuest ? "제한적" : "계정 기반 유지"}
            description={isGuest ? "비회원 계정은 앱 삭제 또는 기기 변경 시 데이터 복구가 어려울 수 있습니다." : "회원 계정은 동일한 계정으로 다시 로그인하면 서버에 저장된 데이터를 이어서 사용할 수 있습니다."}
          />
          <InfoRow
            label="복구"
            value={isGuest ? "지원 안 함" : "로그인으로 복구"}
            description={isGuest ? "비회원 계정은 별도 백업 내보내기 기능이 아직 제공되지 않습니다." : "동일한 계정명과 비밀번호로 로그인하면 기존 차량 및 기록 데이터를 다시 불러올 수 있습니다."}
          />
        </div>
      </SectionCard>

      <SectionCard title="개인정보처리방침" description="Play Store 제출에 사용되는 공개 URL과 앱 내 요약본을 확인할 수 있습니다.">
        <div className="space-y-3">
          <InfoRow label="공개 URL" value={PRIVACY_POLICY_URL} description="스토어 제출과 사용자 고지에 사용됩니다." />
          <button
            type="button"
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90"
            onClick={() => setPolicyOpen(true)}
          >
            개인정보처리방침 보기
          </button>
        </div>
      </SectionCard>

      {policyOpen ? <PolicyModal onClose={() => setPolicyOpen(false)} /> : null}
    </div>
  );
}
