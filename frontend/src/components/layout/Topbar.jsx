import { ChevronRight, RefreshCw, Sun, Moon, Circle } from "lucide-react";

export function Topbar({ pageTitle, loading, onRefresh, theme, onToggleTheme }) {
  return (
    <header className="topbar">
      <div className="topbar-context">
        <div className="breadcrumb">
          <span>RETRAX</span>
          <ChevronRight size={12} />
          <span className="breadcrumb-active">{pageTitle}</span>
        </div>
        <div className="topbar-title">{pageTitle}</div>
      </div>

      <div className="topbar-center-state" aria-hidden="true">
        <Circle size={6} className="topbar-live-dot" />
        <span>MEMORY-AUGMENTED OPERATIONS</span>
      </div>

      <div className="topbar-actions">
        <button className="icon-button" type="button" onClick={onRefresh} title="Refresh intelligence" disabled={loading}>
          <RefreshCw size={16} className={loading ? "spin" : ""} />
        </button>
        <button className="icon-button" type="button" onClick={onToggleTheme} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <div className="operator-badge" title="Active operator">AB</div>
      </div>
    </header>
  );
}
