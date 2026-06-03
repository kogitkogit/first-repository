export default function GlobalLoadingOverlay({
  open,
  title = "처리 중입니다",
  message = "잠시만 기다려주세요",
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 px-6 backdrop-blur-sm"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex w-full max-w-[280px] flex-col items-center rounded-[28px] border border-white/15 bg-slate-950/90 px-6 py-7 text-center text-white shadow-2xl">
        <div className="relative mb-5 flex h-14 w-14 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-white/15" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-white" />
          <span className="material-symbols-outlined text-2xl text-white">directions_car</span>
        </div>
        <p className="text-base font-bold">{title}</p>
        <p className="mt-2 text-sm leading-5 text-white/75">{message}</p>
      </div>
    </div>
  );
}
