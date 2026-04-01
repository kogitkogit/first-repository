export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  tone = "danger",
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!open) return null;

  const confirmClass =
    tone === "danger"
      ? "bg-red-600 hover:bg-red-700"
      : "bg-primary hover:bg-primary/90";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-surface-light p-6 shadow-2xl">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-text-light">{title}</h2>
          {description ? <p className="text-sm text-subtext-light">{description}</p> : null}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className="rounded-xl border border-border-light px-4 py-2 text-sm font-semibold text-subtext-light transition hover:text-primary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60 ${confirmClass}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "처리 중..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
