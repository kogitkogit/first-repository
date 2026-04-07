import { useMemo, useState } from "react";
import api from "../api/client";
import { useToast } from "./ui/ToastProvider";

const AGREEMENT_CONTENT = {
  terms: {
    title: "서비스 이용약관",
    sections: [
      "CarCare는 차량 관리 기록, 정비 이력, 주유 및 충전 기록, 비용 관리 기능을 제공하는 차량 관리 서비스입니다.",
      "이용자는 정확한 정보를 입력해야 하며, 타인의 권리를 침해하거나 관련 법령을 위반하는 방식으로 서비스를 이용할 수 없습니다.",
      "운영 정책 위반이나 비정상 접근이 확인되면 서비스 이용이 제한될 수 있습니다.",
    ],
  },
  privacy: {
    title: "개인정보 수집·이용 동의",
    sections: [
      "차량 관리 서비스 제공을 위해 아이디, 비밀번호, 차량 정보와 같은 필수 정보를 수집합니다.",
      "수집한 정보는 계정 식별, 차량 관리 기능 제공, 고객 문의 대응을 위해 사용됩니다.",
      "자세한 내용은 개인정보처리방침과 docs/privacy_policy.md 기준 문서를 따릅니다.",
    ],
  },
  marketing: {
    title: "마케팅 정보 수신 동의",
    sections: [
      "이벤트, 업데이트, 운영 안내 메시지를 받을 수 있습니다.",
      "해당 동의는 선택 사항이며, 동의하지 않아도 기본 서비스 이용에는 제한이 없습니다.",
      "수신 동의 여부는 추후 설정 정책이 추가될 때 변경할 수 있습니다.",
    ],
  },
};

export default function RegisterScreen({ onBack, onRegisterSuccess }) {
  const { showToast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreements, setAgreements] = useState({
    all: false,
    terms: false,
    privacy: false,
    marketing: false,
  });
  const [activeAgreement, setActiveAgreement] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const requiredChecked = agreements.terms && agreements.privacy;
  const activeContent = useMemo(
    () => (activeAgreement ? AGREEMENT_CONTENT[activeAgreement] : null),
    [activeAgreement],
  );

  const toggleAgreement = (key) => {
    if (key === "all") {
      const next = !agreements.all;
      setAgreements({ all: next, terms: next, privacy: next, marketing: next });
      return;
    }
    const next = { ...agreements, [key]: !agreements[key] };
    next.all = next.terms && next.privacy && next.marketing;
    setAgreements(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!requiredChecked) {
      setError("필수 약관에 동의해야 가입할 수 있습니다.");
      return;
    }
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await api.post("/auth/register", { username, password });
      const { access_token, user_id, username: accountName, account_type } = res.data;
      showToast({ tone: "success", message: "회원가입이 완료되었습니다.", placement: "center", duration: 1600 });
      if (onRegisterSuccess) {
        onRegisterSuccess(access_token, accountName, user_id, account_type || "registered");
        return;
      }
      if (onBack) onBack();
    } catch (err) {
      console.error("회원가입 오류:", err);
      setError("회원가입에 실패했습니다. 이미 사용 중인 계정인지 확인해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background-light text-text-light">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between bg-background-light px-4">
        <button type="button" aria-label="뒤로가기" className="flex h-10 w-10 items-center justify-start text-text-light" onClick={onBack}>
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <h1 className="text-base font-bold">회원가입</h1>
        <div className="h-10 w-10" />
      </header>

      <main className="flex-1 px-6 py-6">
        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2">
            <span className="text-base font-medium">아이디</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="사용할 아이디를 입력해주세요"
              className="h-14 rounded-lg border border-border-light bg-surface-light px-4 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-base font-medium">비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="문자와 숫자를 조합해 입력해주세요"
              className="h-14 rounded-lg border border-border-light bg-surface-light px-4 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-base font-medium">비밀번호 확인</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="비밀번호를 다시 입력해주세요"
              className={`h-14 rounded-lg border px-4 text-base focus:outline-none focus:ring-2 ${
                confirmPassword && password !== confirmPassword
                  ? "border-status-danger focus:border-status-danger focus:ring-status-danger/40"
                  : "border-border-light bg-surface-light focus:border-primary focus:ring-primary/40"
              }`}
              required
            />
            {confirmPassword && password !== confirmPassword ? (
              <span className="text-sm text-status-danger">비밀번호가 일치하지 않습니다.</span>
            ) : null}
          </label>

          <section className="rounded-xl border border-border-light bg-surface-light px-4 py-3">
            <label className="flex items-center gap-3 py-3">
              <input type="checkbox" checked={agreements.all} onChange={() => toggleAgreement("all")} className="h-5 w-5 rounded border-border-light text-primary focus:ring-primary" />
              <span className="text-base font-semibold">전체 동의</span>
            </label>
            <div className="h-px w-full bg-border-light" />
            <div className="flex flex-col">
              <AgreementRow checked={agreements.terms} onChange={() => toggleAgreement("terms")} onView={() => setActiveAgreement("terms")} label="(필수) 서비스 이용약관 동의" />
              <AgreementRow checked={agreements.privacy} onChange={() => toggleAgreement("privacy")} onView={() => setActiveAgreement("privacy")} label="(필수) 개인정보 수집·이용 동의" />
              <AgreementRow checked={agreements.marketing} onChange={() => toggleAgreement("marketing")} onView={() => setActiveAgreement("marketing")} label="(선택) 마케팅 정보 수신 동의" />
            </div>
          </section>

          {error ? <p className="text-sm text-status-danger">{error}</p> : null}

          <button
            type="submit"
            disabled={!requiredChecked || loading}
            className={`flex h-14 items-center justify-center rounded-lg text-base font-bold transition ${
              requiredChecked && !loading ? "bg-primary text-white hover:bg-primary/90" : "bg-border-light text-subtext-light"
            }`}
          >
            {loading ? "가입 중..." : "회원가입 완료"}
          </button>
        </form>
      </main>

      <footer className="px-6 pb-8 pt-4 text-center text-sm text-subtext-light">
        이미 계정이 있다면
        <button type="button" onClick={onBack} className="ml-2 font-semibold text-primary">
          로그인
        </button>
      </footer>

      {activeContent ? <AgreementModal title={activeContent.title} sections={activeContent.sections} onClose={() => setActiveAgreement(null)} /> : null}
    </div>
  );
}

function AgreementRow({ checked, onChange, onView, label }) {
  return (
    <label className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-3">
        <input type="checkbox" checked={checked} onChange={onChange} className="h-5 w-5 rounded border-border-light text-primary focus:ring-primary" />
        <span className="text-sm">{label}</span>
      </div>
      <button type="button" onClick={onView} className="text-xs text-subtext-light underline">
        보기
      </button>
    </label>
  );
}

function AgreementModal({ title, sections, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-3xl bg-surface-light shadow-2xl">
        <div className="flex items-center justify-between border-b border-border-light px-5 py-4">
          <h3 className="text-lg font-semibold text-text-light">{title}</h3>
          <button type="button" className="text-subtext-light" onClick={onClose} aria-label="닫기">
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
        <div className="space-y-3 overflow-y-auto px-5 py-4">
          {sections.map((section, index) => (
            <p key={`${title}-${index}`} className="text-sm leading-6 text-subtext-light">
              {section}
            </p>
          ))}
        </div>
        <div className="border-t border-border-light px-5 py-4">
          <button type="button" className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90" onClick={onClose}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
