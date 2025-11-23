import { useEffect, useState } from "react";
import api from "../api/client";

export default function SettingsPanel({ userId, vehicle }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState({ oil: false, filter: false, consumable: false });

  useEffect(() => {
    if (!userId || !vehicle) return;
    setLoading(true);
    setError(null);
    api
      .get("/notifications", { params: { userId, vehicleId: vehicle.id } })
      .then((res) => {
        const oil = res.data.find((n) => n.type === "oil");
        const filter = res.data.find((n) => n.type === "filter");
        const consumable = res.data.find((n) => n.type === "consumable");
        setNotifications({
          oil: !!oil?.enabled,
          filter: !!filter?.enabled,
          consumable: !!consumable?.enabled,
        });
      })
      .catch((err) => {
        console.error(err);
        setError("알림 설정을 불러오지 못했습니다.");
      })
      .finally(() => setLoading(false));
  }, [userId, vehicle?.id]);

  const handleToggle = async (type, nextValue) => {
    if (!userId || !vehicle) return;
    setNotifications((prev) => ({ ...prev, [type]: nextValue }));
    try {
      await api.put("/notifications", {
        user_id: userId,
        vehicle_id: vehicle.id,
        type,
        enabled: nextValue,
      });
    } catch (err) {
      console.error(err);
      setNotifications((prev) => ({ ...prev, [type]: !nextValue }));
      alert("알림 설정 저장에 실패했습니다. 다시 시도해주세요.");
    }
  };

  if (!userId || !vehicle) {
    return (
      <div className="p-4 text-sm text-subtext-light">
        알림 설정을 사용하려면 차량을 선택한 뒤 다시 시도해주세요.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 text-sm text-subtext-light">
        알림 설정을 불러오는 중입니다...
      </div>
    );
  }

  const toggleItems = [
    {
      key: "oil",
      label: "오일 교체 알림",
      description: "주요 오일 교체 시기를 놓치지 않도록 안내드립니다.",
    },
    {
      key: "filter",
      label: "필터 교체 알림",
      description: "에어·캐빈 필터 등 필터류 교체 시기를 알려드립니다.",
    },
    {
      key: "consumable",
      label: "소모품 알림",
      description: "와이퍼, 배터리 등 기타 소모품 교체 시기를 알림으로 받아보세요.",
    },
  ];

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-text-light">환경 설정</h2>
        <p className="text-sm text-subtext-light">원하는 알림을 설정하고 필요 없는 알림은 간편하게 끄세요.</p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      ) : null}

      <section className="rounded-2xl border border-border-light bg-surface-light p-5 shadow-card">
        <h3 className="text-lg font-semibold text-text-light">알림 설정</h3>
        <div className="mt-3 divide-y divide-border-light">
          {toggleItems.map((item) => {
            const active = notifications[item.key];
            return (
              <div key={item.key} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-text-light">{item.label}</p>
                  <p className="text-xs text-subtext-light">
                    {active ? "알림이 켜져 있습니다." : "알림이 꺼져 있습니다."} {item.description}
                  </p>
                </div>
                <label className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={active}
                    onChange={(e) => handleToggle(item.key, e.target.checked)}
                  />
                  <div className="h-6 w-11 rounded-full bg-border-light transition duration-200 peer-checked:bg-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-primary/40" />
                  <div className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform duration-200 peer-checked:translate-x-5" />
                </label>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border-light bg-surface-light p-5 shadow-card">
        <h3 className="text-lg font-semibold text-text-light">앱 정보</h3>
        <div className="mt-3 space-y-1 text-sm text-subtext-light">
          <p>버전: 1.0.0</p>
          <p>고객센터: 010-1234-5678</p>
          <p>이메일: support@carcare.com</p>
        </div>
      </section>
    </div>
  );
}
