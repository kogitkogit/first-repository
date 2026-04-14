export default function DocumentModal({ open, title, effectiveDate, sections, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40">
      <div className="flex min-h-screen w-screen items-center justify-center p-4">
        <div className="flex max-h-[82vh] w-full max-w-2xl flex-col rounded-3xl bg-surface-light shadow-2xl">
          <div className="flex items-center justify-between border-b border-border-light px-6 py-4">
            <div>
              <h3 className="text-lg font-semibold text-text-light">{title}</h3>
              {effectiveDate ? <p className="mt-1 text-xs text-subtext-light">시행일: {effectiveDate}</p> : null}
            </div>
            <button type="button" className="text-subtext-light" onClick={onClose} aria-label="문서 닫기">
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>
          <div className="space-y-5 overflow-y-auto px-6 py-5">
            {sections.map((section) => (
              <section key={section.heading} className="space-y-2">
                <h4 className="text-sm font-semibold text-text-light">{section.heading}</h4>
                <p className="text-sm leading-6 text-subtext-light">{section.body}</p>
              </section>
            ))}
          </div>
          <div className="border-t border-border-light px-6 py-4">
            <button
              type="button"
              className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
              onClick={onClose}
            >
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
