import { useState, useEffect } from "react";
import api from "../api/client";

export default function VehicleSelectScreen({ vehicles, onSelect, onCreated, userId }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    plate_no: "",
    makerType: "domestic",
    maker: "",
    model: "",
    year: "",
    displacement_cc: "",
    odo_km: "",
    owner_name: "",
  });
  const [domesticMakers, setDomesticMakers] = useState([]);
  const [abroadMakers, setAbroadMakers] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/vehicles/makers/domestic")
      .then((res) => setDomesticMakers(Array.isArray(res.data) ? res.data : res.data?.makers || []))
      .catch(() => {});
    api
      .get("/vehicles/makers/abroad")
      .then((res) => setAbroadMakers(Array.isArray(res.data) ? res.data : res.data?.makers || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (form.maker) {
      const makerParam = encodeURIComponent(form.maker);
      const url =
        form.makerType === "domestic"
          ? `/vehicles/models/domestic?maker=${makerParam}`
          : `/vehicles/models/abroad?maker=${makerParam}`;
      api
        .get(url)
        .then((res) => {
          const modelsData = Array.isArray(res.data) ? res.data : res.data?.models || [];
          setModels(modelsData);
          if (form.model) {
            const selected = modelsData.find((m) => (m.name ?? m.value) === form.model);
            if (selected && selected.displacement_cc) {
              setForm((prev) => ({ ...prev, displacement_cc: selected.displacement_cc }));
            }
          }
        })
        .catch(() => {});
    } else {
      setModels([]);
    }
  }, [form.maker, form.makerType]);

  useEffect(() => {
    if (form.model && models.length) {
      const selected = models.find((m) => (m.name ?? m.value) === form.model);
      if (selected && selected.displacement_cc) {
        setForm((prev) => ({ ...prev, displacement_cc: selected.displacement_cc }));
      }
    }
  }, [form.model, models]);

  const createVehicle = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = {
        plate_no: form.plate_no || null,
        maker: form.maker || null,
        model: form.model || null,
        year: form.year && !isNaN(form.year) ? Number(form.year) : null,
        displacement_cc: form.displacement_cc && !isNaN(form.displacement_cc) ? Number(form.displacement_cc) : null,
        odo_km: form.odo_km && !isNaN(form.odo_km) ? Number(form.odo_km) : 0,
        owner_name: form.owner_name || null,
        makerType: form.makerType || null,
        userId,
      };

      await api.post("/vehicles/add", payload);
      setOpen(false);
      setForm({
        plate_no: "",
        makerType: "domestic",
        maker: "",
        model: "",
        year: "",
        displacement_cc: "",
        odo_km: "",
        owner_name: "",
      });
      onCreated?.();
    } catch (err) {
      console.error("차량 등록 오류:", err);
      setError("차량 등록 중 문제가 발생했습니다. 입력값을 확인해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const makerOptions = form.makerType === "domestic" ? domesticMakers : abroadMakers;

  const renderList = () => {
    if (!vehicles?.length) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border-light bg-surface-light px-6 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="material-symbols-outlined text-3xl">directions_car</span>
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold">등록된 차량이 없습니다</p>
            <p className="text-sm text-subtext-light">차량을 추가하면 맞춤형 관리 기능을 사용할 수 있어요.</p>
          </div>
          <button
            type="button"
            className="flex h-12 min-w-[180px] items-center justify-center rounded-lg bg-primary px-4 text-base font-semibold text-white transition hover:bg-primary/90"
            onClick={() => setOpen(true)}
          >
            새 차량 등록
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        {vehicles.map((v) => (
          <button
            key={v.id}
            type="button"
            className="flex items-center gap-4 rounded-xl border border-border-light bg-surface-light p-4 text-left shadow-card transition hover:border-primary hover:bg-primary/5"
            onClick={() => onSelect(v)}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="material-symbols-outlined">directions_car</span>
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold text-text-light">{v.plate_no || "차량 번호 없음"}</p>
              <p className="text-sm text-subtext-light">
                {[v.maker, v.model, v.year ? `${v.year}년형` : null, v.displacement_cc ? `${v.displacement_cc}cc` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex items-center text-subtext-light">
              <span className="material-symbols-outlined">chevron_right</span>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">내 차량 선택</h2>
        {vehicles?.length ? (
          <button
            type="button"
            className="flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90"
            onClick={() => setOpen(true)}
          >
            <span className="material-symbols-outlined text-lg">add</span>
            새 차량 등록
          </button>
        ) : null}
      </div>

      {renderList()}

      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0">
          <div className="w-full max-w-lg rounded-t-2xl bg-background-light">
            <button
              type="button"
              aria-label="닫기"
              className="flex w-full items-center justify-center pt-3"
              onClick={() => setOpen(false)}
            >
              <div className="h-1 w-10 rounded-full bg-border-light" />
            </button>
            <div className="px-6 pb-6 pt-4">
              <h3 className="text-lg font-bold">새 차량 등록</h3>
              <form className="mt-6 flex flex-col gap-4" onSubmit={createVehicle}>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">차량 번호</span>
                  <input
                    value={form.plate_no}
                    onChange={(e) => setForm({ ...form, plate_no: e.target.value })}
                    className="h-12 rounded-lg border border-border-light bg-surface-light px-4 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    required
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium">제조사 구분</span>
                    <select
                      value={form.makerType}
                      onChange={(e) => setForm({ ...form, makerType: e.target.value, maker: "", model: "" })}
                      className="h-12 rounded-lg border border-border-light bg-surface-light px-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="domestic">국산</option>
                      <option value="abroad">수입</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium">제조사</span>
                    <select
                      value={form.maker}
                      onChange={(e) => setForm({ ...form, maker: e.target.value, model: "" })}
                      className="h-12 rounded-lg border border-border-light bg-surface-light px-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="">선택</option>
                      {makerOptions.map((m) => {
                        const value = (m && (m.name ?? m.value)) ?? m;
                        const label = (m && (m.name ?? m.label)) ?? m;
                        const key = (m && (m.id ?? m.value)) ?? label;
                        return (
                          <option key={key} value={value}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">모델</span>
                  <select
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    disabled={!form.maker}
                    className="h-12 rounded-lg border border-border-light bg-surface-light px-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:bg-gray-100"
                  >
                    <option value="">선택</option>
                    {models.map((m) => {
                      const value = (m && (m.name ?? m.value)) ?? m;
                      const label = (m && (m.name ?? m.label)) ?? m;
                      const key = (m && (m.id ?? m.value)) ?? label;
                      return (
                        <option key={key} value={value}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium">배기량 (cc)</span>
                    <input
                      value={form.displacement_cc}
                      onChange={(e) => setForm({ ...form, displacement_cc: e.target.value })}
                      className="h-12 rounded-lg border border-border-light bg-surface-light px-4 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium">연식</span>
                    <input
                      value={form.year}
                      onChange={(e) => setForm({ ...form, year: e.target.value })}
                      className="h-12 rounded-lg border border-border-light bg-surface-light px-4 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">현재 주행거리 (km)</span>
                  <input
                    value={form.odo_km}
                    onChange={(e) => setForm({ ...form, odo_km: e.target.value })}
                    className="h-12 rounded-lg border border-border-light bg-surface-light px-4 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">차량 소유주</span>
                  <input
                    value={form.owner_name}
                    onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                    className="h-12 rounded-lg border border-border-light bg-surface-light px-4 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>

                {error && <p className="text-sm text-status-danger">{error}</p>}

                <div className="mt-2 flex gap-3">
                  <button
                    type="button"
                    className="flex h-12 flex-1 items-center justify-center rounded-lg border border-border-light text-base font-medium text-subtext-light"
                    onClick={() => setOpen(false)}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-12 flex-1 items-center justify-center rounded-lg bg-primary text-base font-semibold text-white transition hover:bg-primary/90 disabled:bg-primary/50"
                  >
                    {loading ? "등록 중..." : "등록"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
