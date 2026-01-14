import React from "react";

export default function PanelTabs({ tabs = [], activeKey, onChange }) {
  if (!tabs.length) return null;

  const gridStyle = { gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` };

  return (
    <div className="px-4 pt-2 pb-4">
      <div className="rounded-lg border border-border-light bg-surface-light/90 shadow-sm">
        <div className="grid" style={gridStyle}>
          {tabs.map((tab, index) => {
            const isActive = tab.key === activeKey;
            const isLast = index === tabs.length - 1;
            const dividerClass = !isLast ? "border-r border-border-light/60" : "";
            return (
              <button
                key={tab.key}
                type="button"
                className={`flex w-full items-center justify-center gap-2 rounded-none px-4 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "bg-primary text-white shadow"
                    : "bg-transparent text-subtext-light hover:text-text-light"
                } ${dividerClass}`}
                onClick={() => onChange?.(tab.key)}
                aria-pressed={isActive}
              >
                {tab.icon ? (
                  <span className="material-symbols-outlined text-base">{tab.icon}</span>
                ) : null}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
