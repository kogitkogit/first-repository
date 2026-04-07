import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

let nextToastId = 1;

function toneClasses(tone) {
  switch (tone) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "error":
      return "border-red-200 bg-red-50 text-red-700";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-900 text-white";
  }
}

function wrapperClasses(placement) {
  return placement === "center"
    ? "pointer-events-none fixed left-1/2 top-1/2 z-[100] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center px-4"
    : "pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4";
}

function cardClasses(placement) {
  return placement === "center"
    ? "pointer-events-auto flex min-w-[180px] max-w-[240px] items-center justify-center rounded-2xl border px-5 py-4 text-center shadow-2xl"
    : "pointer-events-auto flex w-full max-w-md items-start justify-between gap-3 rounded-2xl border px-4 py-3 shadow-lg";
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ message, tone = "info", duration = 2600, placement = "top" }) => {
      if (!message) return;
      const id = nextToastId++;
      setToasts((prev) => [...prev, { id, message, tone, placement }]);
      if (duration > 0 && typeof window !== "undefined") {
        window.setTimeout(() => dismissToast(id), duration);
      }
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,
    }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.map((toast) => (
        <div key={toast.id} className={wrapperClasses(toast.placement)}>
          <div className={`${cardClasses(toast.placement)} ${toneClasses(toast.tone)}`}>
            <p className="text-sm font-medium">{toast.message}</p>
            {toast.placement === "center" ? null : (
              <button
                type="button"
                className="rounded-full p-1 text-current/70 transition hover:text-current"
                onClick={() => dismissToast(toast.id)}
                aria-label="토스트 닫기"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
          </div>
        </div>
      ))}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
