import { useMemo, useState } from "react";
import api from "../api/client";
import { useToast } from "./ui/ToastProvider";
import DocumentModal from "./ui/DocumentModal";
import { APP_NAME, POLICY_DOCUMENTS } from "../content/policyDocuments";

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
  const activeContent = useMemo(() => (activeAgreement ? POLICY_DOCUMENTS[activeAgreement] : null), [activeAgreement]);

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
      setError("필수 항목에 동의해야 가입할 수 있습니다.");
      return;
    }
    if (!username || !password) {
      setError("아이디와 비밀번호를 입력해주세요.");
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
        <h1 className="text-base font-bold">{APP_NAME} 회원가입</h1>
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
              <AgreementRow checked={agreements.terms} onChange={() => toggleAgreement("terms")} onView={() => setActiveAgreement("terms")} label="(필수) 서비스 이용 안내 동의" />
              <AgreementRow checked={agreements.privacy} onChange={() => toggleAgreement("privacy")} onView={() => setActiveAgreement("privacy")} label="(필수) 개인정보처리방침 확인" />
              <AgreementRow checked={agreements.marketing} onChange={() => toggleAgreement("marketing")} onView={() => setActiveAgreement("backup")} label="(선택) 백업 및 복구 정책 확인" />
            </div>
          </section>

          <div className="rounded-2xl border border-border-light bg-background-light px-4 py-4 text-sm leading-6 text-subtext-light">
            서비스 이용 안내는 <InlineDocButton onClick={() => setActiveAgreement("terms")} />를, 개인정보처리방침은{" "}
            <InlineDocButton onClick={() => setActiveAgreement("privacy")} />를 클릭해 바로 볼 수 있습니다.
          </div>

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

      <DocumentModal
        open={Boolean(activeContent)}
        title={activeContent?.title}
        effectiveDate={activeContent?.effectiveDate}
        sections={activeContent?.sections || []}
        onClose={() => setActiveAgreement(null)}
      />
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
      <button type="button" onClick={onView} className="text-xs font-semibold text-primary underline">
        여기
      </button>
    </label>
  );
}

function InlineDocButton({ onClick }) {
  return (
    <button type="button" className="font-semibold text-primary underline" onClick={onClick}>
      여기
    </button>
  );
}
