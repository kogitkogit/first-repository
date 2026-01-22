import React, { useState, useEffect } from "react";
import RegisterScreen from "./RegisterScreen";
import api from "../api/client";

const LoginScreen = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberUsername, setRememberUsername] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetUserId, setResetUserId] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    const savedUsername = localStorage.getItem("remembered_username");
    const savedPassword = localStorage.getItem("remembered_password");
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberUsername(true);
    }
    if (savedPassword) {
      setPassword(savedPassword);
      setRememberPassword(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/login", { username, password });
      const { access_token, user_id } = res.data;

      if (!access_token) {
        alert("로그인에 실패했습니다. 다시 시도해주세요.");
        return;
      }

      localStorage.setItem("access_token", access_token);
      localStorage.setItem("user_id", String(user_id));

      if (rememberUsername) {
        localStorage.setItem("remembered_username", username);
      } else {
        localStorage.removeItem("remembered_username");
      }

      if (rememberPassword) {
        localStorage.setItem("remembered_password", password);
      } else {
        localStorage.removeItem("remembered_password");
      }

      onLoginSuccess(access_token, username, user_id);
    } catch (err) {
      console.error("로그인 오류:", err);
      alert("로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.");
    }
  };

  if (showRegister) {
    return <RegisterScreen onBack={() => setShowRegister(false)} />;
  }

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetUserId.trim()) {
      setResetError("아이디를 입력해주세요.");
      return;
    }
    if (!resetPassword || !resetConfirm) {
      setResetError("새 비밀번호를 입력해주세요.");
      return;
    }
    if (resetPassword !== resetConfirm) {
      setResetError("비밀번호가 일치하지 않습니다.");
      return;
    }
    try {
      setResetError("");
      await api.post("/auth/reset", { username: resetUserId.trim(), new_password: resetPassword });
      setResetDone(true);
      setUsername(resetUserId.trim());
      setPassword("");
      setTimeout(() => {
        setShowReset(false);
        setResetUserId("");
        setResetPassword("");
        setResetConfirm("");
        setResetError("");
        setResetDone(false);
      }, 800);
    } catch (err) {
      console.error("비밀번호 재설정 실패:", err);
      setResetError("비밀번호 재설정에 실패했습니다. 아이디를 확인해주세요.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background-light text-text-light">
      <div className="flex flex-1 flex-col px-6 py-8">
        <div className="flex justify-center py-8">
          <span className="material-symbols-outlined text-primary text-5xl">directions_car</span>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">다시 만나서 반가워요</h1>
          <p className="mt-2 text-base text-subtext-light">차량 관리를 시작하려면 로그인해주세요.</p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleLogin}>
          <label className="flex flex-col gap-2">
            <span className="text-base font-medium">아이디 또는 이메일</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디 또는 이메일을 입력하세요"
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
                placeholder="비밀번호를 입력하세요"
                className="flex-1 px-4 text-base focus:outline-none"
              />
              <button
                type="button"
                aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                className="flex h-full w-14 items-center justify-center text-subtext-light transition hover:bg-primary/10"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                <span className="material-symbols-outlined text-2xl">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </label>

          <div className="flex items-center justify-between text-sm text-subtext-light">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={rememberUsername}
                onChange={() => setRememberUsername((prev) => !prev)}
                className="h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
              />
              <span>아이디 기억하기</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={rememberPassword}
                onChange={() => setRememberPassword((prev) => !prev)}
                className="h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
              />
              <span>비밀번호 기억하기</span>
            </label>
          </div>

          <button
            type="submit"
            className="mt-4 flex h-14 items-center justify-center rounded-lg bg-primary text-base font-bold text-white transition hover:bg-primary/90"
          >
            로그인
          </button>
        </form>

        <div className="mt-8 flex items-center justify-center gap-6 text-sm text-subtext-light">
          <button type="button" className="font-medium hover:text-primary" onClick={() => setShowReset(true)}>
            비밀번호 찾기
          </button>
          <span className="h-4 w-px bg-border-light" />
          <button type="button" onClick={() => setShowRegister(true)} className="font-medium text-primary">
            회원가입
          </button>
        </div>
      </div>

      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-text-light">비밀번호 재설정</h2>
              <button
                type="button"
                className="text-subtext-light transition hover:text-text-light"
                onClick={() => {
                  setShowReset(false);
                  setResetUserId("");
                  setResetPassword("");
                  setResetConfirm("");
                  setResetError("");
                  setResetDone(false);
                }}
              >
                닫기
              </button>
            </div>
            <p className="mt-2 text-sm text-subtext-light">
              아이디 확인 후 새 비밀번호를 설정하세요.
            </p>
            <form className="mt-4 space-y-3" onSubmit={handleResetSubmit}>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-text-light">아이디</span>
                <input
                  value={resetUserId}
                  onChange={(e) => {
                    setResetUserId(e.target.value);
                    if (resetError) setResetError("");
                    if (resetDone) setResetDone(false);
                  }}
                  placeholder="아이디 또는 이메일을 입력하세요"
                  className="h-12 rounded-lg border border-border-light bg-surface-light px-4 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-text-light">새 비밀번호</span>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => {
                    setResetPassword(e.target.value);
                    if (resetError) setResetError("");
                    if (resetDone) setResetDone(false);
                  }}
                  placeholder="새 비밀번호를 입력하세요"
                  className="h-12 rounded-lg border border-border-light bg-surface-light px-4 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-text-light">새 비밀번호 확인</span>
                <input
                  type="password"
                  value={resetConfirm}
                  onChange={(e) => {
                    setResetConfirm(e.target.value);
                    if (resetError) setResetError("");
                    if (resetDone) setResetDone(false);
                  }}
                  placeholder="비밀번호를 다시 입력하세요"
                  className="h-12 rounded-lg border border-border-light bg-surface-light px-4 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              {resetError && <p className="text-sm text-status-danger">{resetError}</p>}
              {resetDone && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해주세요.
                </div>
              )}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  className="flex h-11 flex-1 items-center justify-center rounded-lg border border-border-light text-sm font-semibold text-subtext-light transition hover:text-primary"
                  onClick={() => {
                    setShowReset(false);
                    setResetUserId("");
                    setResetPassword("");
                    setResetConfirm("");
                    setResetError("");
                    setResetDone(false);
                  }}
                >
                  닫기
                </button>
                <button
                  type="submit"
                  className="flex h-11 flex-1 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-white transition hover:bg-primary/90"
                >
                  재설정
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginScreen;
