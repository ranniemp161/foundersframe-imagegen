"use client";

import {
  IconChevron,
  IconCheck,
  IconLock,
  IconUpload,
  IconSliders,
  IconPencil,
  IconGrid,
} from "./Icons";

interface SidebarProps {
  step: number;
  setStep: (step: number) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean | ((c: boolean) => boolean)) => void;
  canAccess: (n: number) => boolean;
  activeModelLabel: string;
  totalGenerated: number;
  logout: () => void;
}

export default function Sidebar({
  step,
  setStep,
  collapsed,
  setCollapsed,
  canAccess,
  activeModelLabel,
  totalGenerated,
  logout,
}: SidebarProps) {
  const NAV = [
    { n: 1, label: "Upload", Icon: IconUpload },
    { n: 2, label: "Settings", Icon: IconSliders },
    { n: 3, label: "Review", Icon: IconPencil },
    { n: 4, label: "Results", Icon: IconGrid },
  ];

  return (
    <aside className="sidebar">
      <div className="sb-top">
        <div className="brand-mark sb-mark">FF</div>
        <span className="sb-wordmark">FoundersFrame</span>
        <button
          className="sb-toggle"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          <IconChevron className="sb-chevron" />
        </button>
      </div>

      <nav className="sb-nav">
        {NAV.map(({ n, label, Icon }) => {
          const accessible = canAccess(n);
          const isActive = n === step;
          const isCompleted = accessible && !isActive;
          const cls = isActive ? "active" : isCompleted ? "completed" : "locked";
          return (
            <button
              key={n}
              className={`sb-item ${cls}`}
              disabled={!accessible}
              onClick={() => accessible && setStep(n)}
              title={collapsed ? label : undefined}
            >
              <span className="sb-icon">
                {isCompleted ? <IconCheck size={20} /> : <Icon size={22} />}
              </span>
              <span className="sb-label">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sb-bottom">
        <div className="sb-divider" />
        <div className="sb-model" title={activeModelLabel}>
          <span className="sb-model-dot" />
          <span className="sb-label sb-model-name">{activeModelLabel}</span>
        </div>
        <div className="sb-stats sb-label">
          <span className="sb-stat-num">{totalGenerated}</span> images generated
        </div>
        <button className="sb-lock" onClick={logout} title="Lock app" aria-label="Lock app">
          <IconLock />
          <span className="sb-label">Lock app</span>
        </button>
      </div>
    </aside>
  );
}
