import { useEffect, useMemo, useState } from "react";
import api from "../api/client";

const TYPE_OPTIONS = ["정비비", "보험료", "세금", "기타"];

const formatCurrency = (value) => {
  if (value == null) return "-";
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return `${num.toLocaleString()} 원`;
};

export default function ExpensesPanel({ vehicle }) {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ date: "", type: "정비비", amount: "", memo: "" });
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = () => {
    if (!vehicle) return;
    api
      .get("/expenses/list", { params: { vehicleId: vehicle.id } })
      .then((r) => setList(r.data ?? []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle?.id]);

  const totalAmount = useMemo(() => {
    return list.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  }, [list]);

  const latestExpense = list.length > 0 ? list[0] : null;

  const handleFormChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!vehicle || !form.date || !form.amount) return;
    setLoading(true);
    try {
      const payload = {
        vehicle_id: vehicle.id,
        date: form.date,
        type: form.type,
        amount: Number(form.amount || 0),
        memo: form.memo,
      };
      await api.post("/expenses/add", payload);
      setForm({ date: "", type: form.type, amount: "", memo: "" });
      setFormOpen(false);
      load();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background-light text-text-light">
      <div className="space-y-6 px-4 py-6 pb-32">
        <section className="rounded-2xl border border-border-light bg-surface-light p-5 shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-subtext-light">이번 달 지출 합계</p>
              <h2 className="mt-2 text-3xl font-bold text-text-light">{formatCurrency(totalAmount)}</h2>
            </div>
            <div className="rounded-2xl bg-primary/10 px-4 py-3 text-sm text-primary">
              <p className="font-semibold">최근 등록</p>
              {latestExpense ? (
                <div className="mt-1 space-y-1">
                  <p>{latestExpense.date}</p>
                  <p className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">bookmark</span>
                    {latestExpense.type}
                  </p>
                  <p className="font-semibold">{formatCurrency(latestExpense.amount)}</p>
                </div>
              ) : (
                <p className="mt-1 text-subtext-light">등록된 지출이 없습니다.</p>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-text-light">지출 내역</h3>
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              <span className="material-symbols-outlined text-base">add</span>
              지출 추가
            </button>
          </div>

          {list.length === 0 ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-border-light bg-surface-light text-center text-sm text-subtext-light">
              <span className="material-symbols-outlined mb-2 text-3xl text-primary/60">receipt_long</span>
              첫 지출을 등록하면 리스트가 채워집니다.
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((item) => (
                <article key={item.id} className="rounded-2xl border border-border-light bg-surface-light p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-subtext-light">{item.date}</span>
                      <span className="text-base font-semibold text-text-light">{item.type}</span>
                    </div>
                    <span className="text-lg font-bold text-primary">{formatCurrency(item.amount)}</span>
                  </div>
                  {item.memo && <p className="mt-2 text-sm text-subtext-light">{item.memo}</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/40 px-4 pb-6 sm:items-center sm:justify-center">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md space-y-4 rounded-3xl bg-surface-light p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-text-light">지출 추가</h4>
              <button type="button" onClick={() => setFormOpen(false)} className="text-subtext-light transition hover:text-text-light">
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-text-light">날짜</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => handleFormChange("date", e.target.value)}
                className="h-11 rounded-xl border border-border-light bg-background-light px-3 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-text-light">구분</span>
              <select
                value={form.type}
                onChange={(e) => handleFormChange("type", e.target.value)}
                className="h-11 rounded-xl border border-border-light bg-background-light px-3 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-text-light">금액 (₩)</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={form.amount}
                onChange={(e) => handleFormChange("amount", e.target.value)}
                className="h-11 rounded-xl border border-border-light bg-background-light px-3 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="예: 48000"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-text-light">메모</span>
              <textarea
                value={form.memo}
                onChange={(e) => handleFormChange("memo", e.target.value)}
                rows={3}
                className="rounded-xl border border-border-light bg-background-light px-3 py-3 text-sm text-text-light focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="지출에 대한 간단한 메모"
              />
            </label>
            <button
              type="submit"
              className={`flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-white transition ${loading ? "bg-primary/50" : "bg-primary hover:bg-primary/90"}`}
              disabled={loading}
            >
              {loading ? "저장 중..." : "저장"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

