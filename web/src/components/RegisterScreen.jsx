import React, { useState } from "react";
import api from "../api/client";

const RegisterScreen = ({ onBack }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreements, setAgreements] = useState({
    all: false,
    terms: false,
    privacy: false,
    marketing: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [policyModal, setPolicyModal] = useState({ open: false, type: null });

  const requiredChecked = agreements.terms && agreements.privacy;

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
      await api.post("/auth/register", { username, password });
      alert("회원가입이 완료되었습니다. 로그인해주세요.");
      if (onBack) onBack();
    } catch (err) {
      console.error("회원가입 오류:", err);
      setError("회원가입에 실패했습니다. 이미 사용 중인 계정인지 확인해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const openPolicyModal = (type) => setPolicyModal({ open: true, type });
  const closePolicyModal = () => setPolicyModal({ open: false, type: null });

  const policyTitleMap = {
    terms: "서비스 이용약관",
    privacy: "개인정보 수집·이용",
    marketing: "마케팅 정보 수신",
  };

  const policyContentMap = {
    terms: [
      "1. 목적",
      "본 약관은 차량 관리 서비스(이하 “서비스”) 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정합니다.",
      "",
      "2. 서비스 제공",
      "회사는 차량 관리, 정비 기록, 주행 정보 관리 등 서비스 기능을 제공합니다. 서비스 내용은 운영상 필요에 따라 변경될 수 있습니다.",
      "",
      "3. 계정 및 보안",
      "이용자는 계정 정보를 안전하게 관리해야 하며, 계정 도용 등으로 발생한 손해에 대해 회사는 고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다.",
      "",
      "4. 이용 제한",
      "이용자가 법령 또는 본 약관을 위반하는 경우 회사는 서비스 이용을 제한하거나 계정을 해지할 수 있습니다.",
      "",
      "5. 책임 제한",
      "회사는 천재지변, 시스템 장애 등 불가항력으로 인한 서비스 제공 불가에 대해 책임을 지지 않습니다.",
    ],
    privacy: [
      "1. 수집 항목",
      "필수: 아이디(이메일), 비밀번호, 차량 정보(차량 번호, 제조사, 모델, 연식, 주행거리 등)",
      "선택: 차량 소유주 이름, 마케팅 수신 여부",
      "",
      "2. 수집 목적",
      "회원가입 및 본인 확인, 서비스 제공(차량 관리/정비 이력/주행 정보), 고객 문의 대응",
      "",
      "3. 보관 및 이용 기간",
      "회원 탈퇴 시까지 보관하며, 관계 법령에 따라 보관이 필요한 정보는 해당 기간 동안 보관합니다.",
      "",
      "4. 제공 및 위탁",
      "원칙적으로 외부에 제공하지 않으며, 서비스 운영에 필요한 경우 사전 고지 후 동의를 받습니다.",
    ],
    marketing: [
      "1. 수신 항목",
      "이메일, 앱 알림 등",
      "",
      "2. 수신 목적",
      "프로모션, 이벤트, 맞춤 혜택 안내",
      "",
      "3. 철회 방법",
      "환경설정 또는 고객센터를 통해 언제든지 수신 동의를 철회할 수 있습니다.",
    ],
  };

  return (
    <div className="flex min-h-screen flex-col bg-background-light text-text-light">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between bg-background-light px-4">
        <button
          type="button"
          aria-label="뒤로가기"
          className="flex h-10 w-10 items-center justify-start text-text-light"
          onClick={onBack}
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <h1 className="text-base font-bold">회원가입</h1>
        <div className="h-10 w-10" />
      </header>

      <main className="flex-1 px-6 py-6">
        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2">
            <span className="text-base font-medium">아이디 또는 이메일</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="예) user@example.com"
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
              placeholder="문자, 숫자를 조합해 입력해주세요"
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
            {confirmPassword && password !== confirmPassword && (
              <span className="text-sm text-status-danger">비밀번호가 일치하지 않습니다.</span>
            )}
          </label>

          <section className="rounded-xl border border-border-light bg-surface-light px-4 py-3">
            <label className="flex items-center gap-3 py-3">
              <input
                type="checkbox"
                checked={agreements.all}
                onChange={() => toggleAgreement("all")}
                className="h-5 w-5 rounded border-border-light text-primary focus:ring-primary"
              />
              <span className="text-base font-semibold">전체 동의</span>
            </label>
            <div className="h-px w-full bg-border-light" />
            <div className="flex flex-col">
              <label className="flex items-center justify-between gap-3 py-2">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={agreements.terms}
                    onChange={() => toggleAgreement("terms")}
                    className="h-5 w-5 rounded border-border-light text-primary focus:ring-primary"
                  />
                  <span className="text-sm">(필수) 서비스 이용약관 동의</span>
                </div>
                <button
                  type="button"
                  className="text-xs text-subtext-light underline"
                  onClick={() => openPolicyModal("terms")}
                >
                  보기
                </button>
              </label>
              <label className="flex items-center justify-between gap-3 py-2">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={agreements.privacy}
                    onChange={() => toggleAgreement("privacy")}
                    className="h-5 w-5 rounded border-border-light text-primary focus:ring-primary"
                  />
                  <span className="text-sm">(필수) 개인정보 수집·이용 동의</span>
                </div>
                <button
                  type="button"
                  className="text-xs text-subtext-light underline"
                  onClick={() => openPolicyModal("privacy")}
                >
                  보기
                </button>
              </label>
              <label className="flex items-center justify-between gap-3 py-2">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={agreements.marketing}
                    onChange={() => toggleAgreement("marketing")}
                    className="h-5 w-5 rounded border-border-light text-primary focus:ring-primary"
                  />
                  <span className="text-sm">(선택) 마케팅 정보 수신 동의</span>
                </div>
                <button
                  type="button"
                  className="text-xs text-subtext-light underline"
                  onClick={() => openPolicyModal("marketing")}
                >
                  보기
                </button>
              </label>
            </div>
          </section>

          {error && <p className="text-sm text-status-danger">{error}</p>}

          <button
            type="submit"
            disabled={!requiredChecked || loading}
            className={`flex h-14 items-center justify-center rounded-lg text-base font-bold transition ${
              requiredChecked && !loading
                ? "bg-primary text-white hover:bg-primary/90"
                : "bg-border-light text-subtext-light"
            }`}
          >
            {loading ? "가입 중..." : "회원가입 완료"}
          </button>
        </form>
      </main>

      <footer className="px-6 pb-8 pt-4 text-center text-sm text-subtext-light">
        이미 계정이 있다면?
        <button type="button" onClick={onBack} className="ml-2 font-semibold text-primary">로그인</button>
      </footer>

      {policyModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-text-light">
                {policyTitleMap[policyModal.type] || "약관"}
              </h2>
              <button
                type="button"
                className="text-subtext-light transition hover:text-text-light"
                onClick={closePolicyModal}
              >
                닫기
              </button>
            </div>
            <div className="mt-4 max-h-[60vh] space-y-2 overflow-auto text-sm text-text-light">
              {(policyContentMap[policyModal.type] || ["표시할 내용이 없습니다."]).map((line, idx) => (
                <p key={`${policyModal.type}-${idx}`}>{line}</p>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
                onClick={closePolicyModal}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterScreen;
