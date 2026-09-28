import { useState, useEffect, useMemo } from "react";
import { AppShell } from "./components/layout/AppShell";
import { CommandCenterPage } from "./pages/CommandCenterPage";
import { IncidentsPage } from "./pages/IncidentsPage";
import { IncidentWorkspacePage } from "./pages/IncidentWorkspacePage";
import { MemoryPage } from "./pages/MemoryPage";
import { RunbooksPage } from "./pages/RunbooksPage";
import { EvaluationsPage } from "./pages/EvaluationsPage";
import { PostmortemsPage } from "./pages/PostmortemsPage";
import { checkHealth } from "./api/health";
import { listIncidents } from "./api/incidents";
import { ORGANIZATION_ID } from "./api/client";
import { MotionConfig } from "framer-motion";

const PAGE_PATHS = {
  command: "/",
  incidents: "/incidents",
  memory: "/memory",
  runbooks: "/runbooks",
  evaluations: "/evaluations",
  postmortems: "/postmortems",
};

function resolveLocation(pathname) {
  const workspaceMatch = pathname.match(/^\/incidents\/([^/]+)\/?$/);
  if (workspaceMatch) {
    return { page: "workspace", incidentId: decodeURIComponent(workspaceMatch[1]) };
  }
  const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
  const page = Object.entries(PAGE_PATHS).find(([, path]) => path === normalizedPath)?.[0];
  return { page: page || "command", incidentId: null };
}

export default function App() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("retrax-theme") || "dark"
  );
  const [activePage, setActivePage] = useState(() => resolveLocation(window.location.pathname).page);
  const [workspaceIncidentId, setWorkspaceIncidentId] = useState(() => resolveLocation(window.location.pathname).incidentId);
  const [incidentsCount, setIncidentsCount] = useState(0);
  const [currentIncidentId, setCurrentIncidentId] = useState(null);
  const [apiOnline, setApiOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("retrax-theme", theme);
  }, [theme]);

  useEffect(() => {
    async function checkStatus() {
      try {
        await checkHealth();
        setApiOnline(true);
        const incidents = await listIncidents(ORGANIZATION_ID);
        const list = Array.isArray(incidents) ? incidents : (incidents?.items || []);
        setIncidentsCount(list.length);
        const current = list.find((item) => String(item.status || "").toLowerCase() !== "resolved") || list[0];
        setCurrentIncidentId(current?.id || null);
      } catch {
        setApiOnline(false);
      }
    }
    checkStatus();
  }, [refreshTrigger]);

  useEffect(() => {
    const syncLocation = () => {
      const location = resolveLocation(window.location.pathname);
      setActivePage(location.page);
      setWorkspaceIncidentId(location.incidentId);
    };
    window.addEventListener("popstate", syncLocation);
    return () => window.removeEventListener("popstate", syncLocation);
  }, []);

  const navigateTo = (pageKey, incidentId) => {
    const path = pageKey === "workspace" && incidentId
      ? `/incidents/${encodeURIComponent(incidentId)}`
      : PAGE_PATHS[pageKey] || PAGE_PATHS.command;
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
    setWorkspaceIncidentId(pageKey === "workspace" ? incidentId : null);
    setActivePage(pageKey);
  };

  const handleRefresh = () => {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
    setTimeout(() => setLoading(false), 600);
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleOpenWorkspace = (incidentId) => {
    navigateTo("workspace", incidentId);
  };

  const handleNavigate = (pageKey, incidentId) => {
    navigateTo(pageKey, incidentId);
  };

  const pageTitle = useMemo(() => {
    switch (activePage) {
      case "incidents":
        return "Incidents Registry";
      case "workspace":
        return "Incident War Room";
      case "memory":
        return "Memory Intelligence";
      case "runbooks":
        return "Runbooks Experience";
      case "evaluations":
        return "Evaluations & Benchmarks";
      case "postmortems":
        return "Postmortems";
      case "command":
      default:
        return "Command Center";
    }
  }, [activePage]);

  return (
    <MotionConfig reducedMotion="user">
      <AppShell
        activePage={activePage}
        setActivePage={navigateTo}
        incidentsCount={incidentsCount}
        apiOnline={apiOnline}
        pageTitle={pageTitle}
        loading={loading}
        onRefresh={handleRefresh}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        currentIncidentId={workspaceIncidentId || currentIncidentId}
      >
      {activePage === "command" && (
        <CommandCenterPage
          key={refreshTrigger}
          onOpenWorkspace={(id) => handleOpenWorkspace(id)}
          onNavigate={(pageKey) => navigateTo(pageKey)}
        />
      )}

      {activePage === "incidents" && (
        <IncidentsPage
          key={refreshTrigger}
          onOpenWorkspace={(id) => handleOpenWorkspace(id)}
        />
      )}

      {activePage === "workspace" && (
        <IncidentWorkspacePage
          key={workspaceIncidentId}
          incidentId={workspaceIncidentId}
          onNavigate={handleNavigate}
        />
      )}

      {activePage === "memory" && (
        <MemoryPage key={refreshTrigger} />
      )}

      {activePage === "runbooks" && (
        <RunbooksPage key={refreshTrigger} />
      )}

      {activePage === "evaluations" && (
        <EvaluationsPage key={refreshTrigger} />
      )}

      {activePage === "postmortems" && (
        <PostmortemsPage key={refreshTrigger} />
      )}
      </AppShell>
    </MotionConfig>
  );
}
