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
                <button type="button" className="text-xs text-subtext-light underline">보기</button>
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
                <button type="button" className="text-xs text-subtext-light underline">보기</button>
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
                <button type="button" className="text-xs text-subtext-light underline">보기</button>
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
    </div>
  );
};

export default RegisterScreen;
