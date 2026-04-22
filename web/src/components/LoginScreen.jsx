import { useEffect, useMemo, useState } from "react";
import RegisterScreen from "./RegisterScreen";
import api from "../api/client";
import { useToast } from "./ui/ToastProvider";
import DocumentModal from "./ui/DocumentModal";
import { APP_NAME, POLICY_DOCUMENTS } from "../content/policyDocuments";

const AGREEMENT_STORAGE_KEY = "naechasutcheop_terms_agreed_v1";

const AGREEMENT_SUMMARY = [
  {
    title: "어떤 정보를 다루나요?",
    body: "차량 번호, 주행거리, 정비 이력, 주유·충전 기록, 타이어 관리 기록 등 차량 관리에 필요한 정보를 다룹니다.",
  },
  {
    title: "왜 정보를 사용하나요?",
    body: "입력한 정보를 바탕으로 차량 관리 기능 제공, 대시보드 집계, 비용 계산, 계정별 데이터 보관에 사용합니다.",
  },
  {
    title: "비회원 시작은 어떻게 되나요?",
    body: "같은 기기에서는 자동으로 이어서 사용할 수 있지만, 앱 삭제나 기기 변경 시 데이터 복구가 어려울 수 있습니다.",
  },
  {
    title: "광고는 어떻게 처리되나요?",
    body: "광고가 적용되는 경우 Google AdMob이 광고 제공과 진단을 위해 필요한 정보를 처리할 수 있습니다.",
  },
];

function DocLinkButton({ label, onClick }) {
  return (
    <button type="button" className="font-semibold text-primary underline" onClick={onClick}>
      {label}
    </button>
  );
}

export default function LoginScreen({ onLoginSuccess }) {
  const { showToast } = useToast();
  const [mode, setMode] = useState("consent");
  const [agreed, setAgreed] = useState(false);
  const [openSummaryIndex, setOpenSummaryIndex] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverWarming, setServerWarming] = useState(true);
  const [activeDoc, setActiveDoc] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedAgreement = localStorage.getItem(AGREEMENT_STORAGE_KEY) === "1";
    setAgreed(storedAgreement);
    setMode(storedAgreement ? "choice" : "consent");
  }, []);

  useEffect(() => {
    let cancelled = false;
    const prewarmServer = async () => {
      try {
        await api.get("/health", { timeout: 12000 });
      } catch (error) {
        console.warn("서버 준비 확인 실패:", error);
      } finally {
        if (!cancelled) setServerWarming(false);
      }
    };
    prewarmServer();
    return () => {
      cancelled = true;
    };
  }, []);

  const canGuestStart = useMemo(() => agreed, [agreed]);
  const activeDocument = activeDoc ? POLICY_DOCUMENTS[activeDoc] : null;

  const handleConsentContinue = () => {
    if (!agreed) {
      showToast({ tone: "warning", message: "필수 이용 내용에 동의해주세요.", placement: "center", duration: 1800 });
      return;
    }
    localStorage.setItem(AGREEMENT_STORAGE_KEY, "1");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("naechasutcheop:terms-agreed"));
    }
    setMode("choice");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      showToast({ tone: "warning", message: "아이디와 비밀번호를 입력해주세요.", placement: "center", duration: 1800 });
      return;
    }
    try {
      setLoading(true);
      const res = await api.post("/auth/login", { username, password });
      const { access_token, user_id, username: accountName, account_type } = res.data;
      onLoginSuccess(access_token, accountName, user_id, account_type || "registered");
    } catch (err) {
      console.error("로그인 오류:", err);
      const message = err?.code === "ECONNABORTED" ? "서버를 준비하는 중입니다. 잠시 후 다시 시도해주세요." : "로그인에 실패했습니다. 계정 정보를 확인해주세요.";
      showToast({ tone: "error", message });
    } finally {
      setLoading(false);
    }
  };

  const handleGuestStart = async () => {
    if (!canGuestStart) return;
    try {
      setLoading(true);
      let res = null;
      const storedResumeToken = typeof window !== "undefined" ? localStorage.getItem("guest_resume_token") : null;

      if (storedResumeToken) {
        try {
          res = await api.post("/auth/guest/resume", { resume_token: storedResumeToken });
        } catch (resumeError) {
          console.warn("기존 비회원 세션 복구 실패:", resumeError);
          const status = resumeError?.response?.status;
          if (status === 401 || status === 404) {
            if (typeof window !== "undefined") {
              localStorage.removeItem("guest_resume_token");
            }
          } else {
            throw resumeError;
          }
        }
      }

      if (!res) {
        res = await api.post("/auth/guest");
      }

      const { access_token, user_id, username: accountName, account_type, guest_resume_token } = res.data;
      const resumed = Boolean(storedResumeToken && res?.config?.url?.includes("/guest/resume"));
      showToast({ tone: "success", message: resumed ? "이전 비회원 계정으로 이어서 시작합니다." : "비회원 계정이 생성되었습니다.", placement: "center", duration: 1600 });
      onLoginSuccess(access_token, accountName, user_id, account_type || "guest", guest_resume_token);
    } catch (error) {
      console.error("비회원 시작 오류:", error);
      const message = error?.code === "ECONNABORTED" ? "서버를 준비하는 중입니다. 잠시 후 다시 시도해주세요." : "비회원 시작에 실패했습니다. 다시 시도해주세요.";
      showToast({ tone: "error", message });
    } finally {
      setLoading(false);
    }
  };

  if (mode === "register") {
    return <RegisterScreen onBack={() => setMode("choice")} onRegisterSuccess={onLoginSuccess} />;
  }

  if (mode === "login") {
    return (
      <div className="flex min-h-screen flex-col bg-background-light text-text-light">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between bg-background-light px-4">
          <button type="button" aria-label="뒤로가기" className="flex h-10 w-10 items-center justify-start text-text-light" onClick={() => setMode("choice")}>
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <h1 className="text-base font-bold">기존 계정 로그인</h1>
          <div className="h-10 w-10" />
        </header>
        <main className="flex-1 px-6 py-8">
          <form className="flex flex-col gap-4" onSubmit={handleLogin}>
            <label className="flex flex-col gap-2">
              <span className="text-base font-medium">아이디</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="가입한 아이디를 입력해주세요"
                className="h-14 rounded-lg border border-border-light bg-surface-light px-4 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-base font-medium">비밀번호</span>
              <div className="flex h-14 items-center overflow-hidden rounded-lg border border-border-light bg-surface-light">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력해주세요"
                  className="flex-1 px-4 text-base focus:outline-none"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  className="flex h-full w-14 items-center justify-center text-subtext-light transition hover:bg-primary/10"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  <span className="material-symbols-outlined text-2xl">{showPassword ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
            </label>
            <button type="submit" disabled={loading} className="mt-4 flex h-14 items-center justify-center rounded-lg bg-primary text-base font-bold text-white transition hover:bg-primary/90 disabled:opacity-60">
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>
        </main>
      </div>
    );
  }

  if (mode === "choice") {
    return (
      <div className="flex min-h-screen flex-col bg-background-light text-text-light">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between bg-background-light px-4">
          <button type="button" aria-label="뒤로가기" className="flex h-10 w-10 items-center justify-start text-text-light" onClick={() => setMode("consent")}>
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <h1 className="text-base font-bold">{APP_NAME} 시작하기</h1>
          <div className="h-10 w-10" />
        </header>
        <main className="flex flex-1 flex-col justify-center px-6 py-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-4xl">directions_car</span>
            </div>
            <h1 className="text-3xl font-bold">{APP_NAME} 시작하기</h1>
            <p className="mt-3 text-base text-subtext-light">원하는 방식으로 바로 시작할 수 있습니다.</p>
            {serverWarming ? <p className="mt-2 text-sm font-medium text-primary">서버 연결을 준비하는 중입니다. 첫 실행 시 잠시 걸릴 수 있습니다.</p> : null}
          </div>

          <div className="space-y-3">
            <button
              type="button"
              className="flex w-full flex-col items-start rounded-2xl border border-border-light bg-surface-light px-5 py-4 text-text-light shadow-card transition hover:border-primary/40"
              onClick={() => setMode("register")}
            >
              <span className="text-base font-bold">회원가입해서 시작하기</span>
              <span className="mt-1 text-sm text-subtext-light">계정으로 로그인해 데이터를 백업하고 복구할 수 있습니다.</span>
            </button>

            <button
              type="button"
              className="flex w-full flex-col items-start rounded-2xl border border-border-light bg-surface-light px-5 py-4 text-text-light shadow-card transition hover:border-primary/40"
              onClick={handleGuestStart}
              disabled={loading}
            >
              <span className="text-base font-bold">비회원으로 시작하기</span>
              <span className="mt-1 text-sm text-subtext-light">같은 기기에서는 자동으로 이어서 사용할 수 있지만, 앱 삭제나 기기 변경 시 데이터 복구가 어려울 수 있습니다.</span>
            </button>

            <button
              type="button"
              className="flex w-full flex-col items-center rounded-2xl border border-primary bg-primary px-5 py-4 text-white shadow-card transition hover:bg-primary/90"
              onClick={() => setMode("login")}
            >
              기존 계정 로그인
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background-light text-text-light">
      <main className="flex flex-1 flex-col justify-center px-6 py-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
            <span className="material-symbols-outlined text-4xl">shield_person</span>
          </div>
          <h1 className="text-3xl font-bold">서비스 이용 동의</h1>
          <p className="mt-3 text-base text-subtext-light">앱을 사용하려면 아래 내용을 확인하고 동의해주세요.</p>
          {serverWarming ? <p className="mt-2 text-sm font-medium text-primary">서버 연결을 준비하는 중입니다. 첫 실행 시 잠시 걸릴 수 있습니다.</p> : null}
        </div>

        <section className="rounded-3xl border border-border-light bg-surface-light p-5 shadow-card">
          <label className="flex items-start gap-3 rounded-2xl border border-border-light bg-background-light px-4 py-4">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-border-light text-primary focus:ring-primary"
            />
            <span className="text-sm leading-6 text-text-light">
              차량 관리 서비스 이용과 개인정보 처리, 비회원 시작 시 데이터 복구 제한 내용을 이해했고 이에 동의합니다.
            </span>
          </label>

          <div className="mt-4 space-y-3">
            {AGREEMENT_SUMMARY.map((item, index) => {
              const isOpen = openSummaryIndex === index;
              return (
                <button
                  key={item.title}
                  type="button"
                  className="w-full rounded-2xl border border-border-light bg-background-light px-4 py-4 text-left transition hover:border-primary/40"
                  onClick={() => setOpenSummaryIndex((prev) => (prev === index ? null : index))}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-text-light">{item.title}</p>
                    <span className="material-symbols-outlined text-subtext-light">
                      {isOpen ? "expand_less" : "expand_more"}
                    </span>
                  </div>
                  {isOpen ? <p className="mt-3 text-sm leading-6 text-subtext-light">{item.body}</p> : null}
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-2xl border border-border-light bg-background-light px-4 py-4 text-sm leading-6 text-subtext-light">
            개인정보처리방침은 <DocLinkButton label="여기" onClick={() => setActiveDoc("privacy")} />를 클릭해 바로 확인할 수 있습니다.
            백업 및 복구 정책은 <DocLinkButton label="여기" onClick={() => setActiveDoc("backup")} />를 클릭해주세요.
          </div>
        </section>

        <button
          type="button"
          className="mt-6 flex h-14 items-center justify-center rounded-2xl bg-primary text-base font-bold text-white transition hover:bg-primary/90"
          onClick={handleConsentContinue}
        >
          동의하고 계속하기
        </button>
      </main>

      <DocumentModal
        open={Boolean(activeDocument)}
        title={activeDocument?.title}
        effectiveDate={activeDocument?.effectiveDate}
        sections={activeDocument?.sections || []}
        onClose={() => setActiveDoc(null)}
      />
    </div>
  );
}
