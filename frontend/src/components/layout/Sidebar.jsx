import { useState } from "react";
import {
  Sparkles,
  LayoutDashboard,
  ShieldAlert,
  BrainCircuit,
  Workflow,
  Gauge,
  BookOpen,
  Menu,
  X,
  Activity,
} from "lucide-react";

const navItems = [
  { label: "Command Center", icon: LayoutDashboard, key: "command" },
  { label: "Incidents", icon: ShieldAlert, key: "incidents" },
  { label: "Memory", icon: BrainCircuit, key: "memory" },
  { label: "Runbooks", icon: Workflow, key: "runbooks" },
  { label: "Evaluations", icon: Gauge, key: "evaluations" },
  { label: "Postmortems", icon: BookOpen, key: "postmortems" },
];

export function Sidebar({ activePage, setActivePage, incidentsCount = 0, apiOnline = false }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const effectivePage = activePage === "workspace" ? "incidents" : activePage;

  return (
    <>
      <button
        className="mobile-nav-toggle"
        type="button"
        onClick={() => setMobileOpen((open) => !open)}
        aria-label="Toggle navigation"
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X size={19} /> : <Menu size={19} />}
      </button>

      {mobileOpen && <div className="mobile-backdrop" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="brand-block">
          <div className="brand-mark"><Sparkles size={16} /></div>
          <div>
            <div className="brand-name">RETRAX</div>
            <div className="brand-subtitle">INCIDENT INTELLIGENCE</div>
          </div>
        </div>

        <div className="sidebar-system-label">
          <span>ENGINEERING WORKSPACE</span>
          <span className="sidebar-version">V0.1</span>
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = effectivePage === item.key;
            return (
              <button
                key={item.key}
                type="button"
                className={`nav-item ${isActive ? "nav-item-active" : ""}`}
                onClick={() => {
                  setActivePage(item.key);
                  setMobileOpen(false);
                }}
              >
                <span className="nav-index">0{index + 1}</span>
                <span className="nav-icon"><Icon size={16} /></span>
                <span className="nav-label">{item.label}</span>
                {item.key === "incidents" && incidentsCount > 0 && <span className="nav-count">{incidentsCount}</span>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-status command-sidebar-status">
          <div className="status-row">
            <span className={`status-dot ${apiOnline ? "status-dot-online" : "status-dot-offline"}`} />
            <span>{apiOnline ? "API CONNECTED" : "API OFFLINE"}</span>
          </div>
          <div className="sidebar-status-meta">
            <span><Activity size={12} /> Runtime</span>
            <strong className={apiOnline ? "status-text-online" : "status-text-offline"}>{apiOnline ? "READY" : "CHECK"}</strong>
          </div>
          <div className="sidebar-memory-status">
            <span>Hindsight Memory</span>
            <span>CHECK ON RUN</span>
          </div>
        </div>
      </aside>
    </>
  );
}
