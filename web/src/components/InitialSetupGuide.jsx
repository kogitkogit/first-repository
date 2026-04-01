import { useNavigate } from "react-router-dom";

const guideSteps = [
  "현재 주행거리를 먼저 입력해 두면 교체 주기와 점검 알림 기준이 정확해집니다.",
  "보험 만기일과 검사 일정을 입력하면 놓치기 쉬운 법적 일정을 함께 관리할 수 있습니다.",
  "첫 주유 또는 충전 기록을 남기면 연비, 전비, 에너지 비용 분석이 시작됩니다.",
  "오일, 필터, 소모품 초기값을 입력하면 대시보드 점검 기준이 차량 상태에 맞게 잡힙니다.",
];

export default function InitialSetupGuide({ vehicle }) {
  const navigate = useNavigate();

  const dismissGuide = (options = {}) => {
    if (typeof window !== "undefined" && vehicle?.id) {
      localStorage.removeItem(`setup-guide-pending:${vehicle.id}`);
    }
    navigate("/", options);
  };

  return (
    <div className="px-4 py-6">
      <section className="rounded-3xl border border-border-light bg-surface-light p-5 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wide text-primary">FIRST SETUP</p>
            <h2 className="text-2xl font-bold text-text-light">초기 설정 가이드</h2>
            <p className="text-sm text-subtext-light">
              차량을 등록한 직후 한 번만 점검하면 이후 알림과 기록 화면이 훨씬 정확해집니다.
            </p>
          </div>
          <button
            type="button"
            aria-label="가이드 닫기"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border-light text-subtext-light transition hover:text-text-light"
            onClick={() => dismissGuide({ replace: true })}
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-primary">
          아래 항목은 순서대로 입력하는 것을 권장합니다. 지금은 주행거리부터 바로 시작할 수 있습니다.
        </div>

        <ol className="mt-5 space-y-3">
          {guideSteps.map((step, index) => (
            <li key={step} className="flex gap-3 rounded-2xl border border-border-light bg-background-light/70 px-4 py-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {index + 1}
              </div>
              <p className="text-sm leading-6 text-text-light">{step}</p>
            </li>
          ))}
        </ol>

        <div className="mt-6">
          <button
            type="button"
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-white transition hover:bg-primary/90"
            onClick={() => dismissGuide({ replace: true, state: { openOdo: true } })}
          >
            주행거리 입력하기
          </button>
        </div>
      </section>
    </div>
  );
}
