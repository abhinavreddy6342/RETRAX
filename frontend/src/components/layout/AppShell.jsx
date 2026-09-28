import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { GlobalAgentLauncher } from "./GlobalAgentLauncher";

export function AppShell({
  activePage,
  setActivePage,
  incidentsCount,
  apiOnline,
  pageTitle,
  loading,
  onRefresh,
  theme,
  onToggleTheme,
  currentIncidentId,
  children,
}) {
  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        incidentsCount={incidentsCount}
        apiOnline={apiOnline}
      />

      <main className="main-content">
        <Topbar
          pageTitle={pageTitle}
          loading={loading}
          onRefresh={onRefresh}
          theme={theme}
          onToggleTheme={onToggleTheme}
        />
        <div className="content-wrap">{children}</div>
      </main>

      <GlobalAgentLauncher incidentId={currentIncidentId} enabled={activePage !== "workspace"} />
    </div>
  );
}
