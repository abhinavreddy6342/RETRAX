import { useState, useEffect } from "react";
import { Link, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { CommandCenterHeader } from "../components/command-center/CommandCenterHeader";
import { MetricsGrid } from "../components/command-center/MetricsGrid";
import { IncidentHeroPanel } from "../components/command-center/IncidentHeroPanel";
import { ReasoningPanel } from "../components/command-center/ReasoningPanel";
import { ComparisonPanel } from "../components/command-center/ComparisonPanel";
import { PatternsPanel } from "../components/command-center/PatternsPanel";
import { DecisionTrajectory } from "../components/command-center/DecisionTrajectory";
import { RunbookPanel } from "../components/command-center/RunbookPanel";
import { MemoryGrid } from "../components/command-center/MemoryGrid";
import { EngineerActionModal } from "../components/command-center/EngineerActionModal";
import { LearningLoop } from "../components/command-center/LearningLoop";
import { MemoryMap } from "../components/command-center/MemoryMap";

import { checkHealth } from "../api/health";
import { listIncidents, getIncident } from "../api/incidents";
import { runInvestigation, compareIncident, getTrajectory, recordAction } from "../api/investigations";
import { recallIncidentExperience } from "../api/memories";
import { getRunbookRecommendations } from "../api/runbooks";
import { getEvaluationSummary } from "../api/evaluations";
import { ORGANIZATION_ID } from "../api/client";

function hindsightUnavailableMessage(error) {
  const detail = error?.response?.data?.detail || "";
  return /insufficient credits/i.test(detail)
    ? "Hindsight is out of credits, so historical reasoning could not be refreshed. Live incident context and the investigation timeline remain available."
    : detail || "Hindsight is unavailable. Live incident context remains available; retry when the service is ready.";
}

export function CommandCenterPage({ onOpenWorkspace, onNavigate }) {
  const [incidents, setIncidents] = useState(null);
  const [incident, setIncident] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [trajectory, setTrajectory] = useState(null);
  const [runbooks, setRunbooks] = useState([]);
  const [memoryItems, setMemoryItems] = useState(null);
  const [evaluationSummary, setEvaluationSummary] = useState(null);
  const [whyOpen, setWhyOpen] = useState(false);

  const [investigating, setInvestigating] = useState(false);
  const [investigationUnavailable, setInvestigationUnavailable] = useState(false);
  const [comparisonUnavailable, setComparisonUnavailable] = useState(false);
  const [runbookUnavailable, setRunbookUnavailable] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const loadIncidentWorkspace = async (selectedIncident) => {
    setIncident(selectedIncident);
    if (!selectedIncident?.id) return;

    const incidentId = selectedIncident.id;
    const serviceId = selectedIncident.service_id;
    const query = "Analyze this incident using historical engineering experience. Identify similar incidents, differences, successful actions, failed actions, warnings, and recommended next steps.";

    const results = await Promise.allSettled([
      runInvestigation(incidentId, ORGANIZATION_ID),
      compareIncident(incidentId, ORGANIZATION_ID),
      getTrajectory(incidentId, ORGANIZATION_ID),
      getRunbookRecommendations(incidentId, serviceId, ORGANIZATION_ID),
      recallIncidentExperience(ORGANIZATION_ID, query, serviceId, 10),
      getEvaluationSummary(ORGANIZATION_ID),
    ]);

    const [investigationRes, comparisonRes, trajectoryRes, runbooksRes, memoryRes, evaluationRes] = results;

    setAnalysis(investigationRes.status === "fulfilled" ? investigationRes.value : null);
    setInvestigationUnavailable(investigationRes.status === "rejected");
    if (investigationRes.status === "rejected") setError(hindsightUnavailableMessage(investigationRes.reason));

    setComparison(comparisonRes.status === "fulfilled" ? comparisonRes.value : null);
    setComparisonUnavailable(comparisonRes.status === "rejected");
    setTrajectory(trajectoryRes.status === "fulfilled" ? trajectoryRes.value : null);
    setRunbooks(runbooksRes.status === "fulfilled" ? runbooksRes.value : []);
    setRunbookUnavailable(runbooksRes.status === "rejected");
    setMemoryItems(memoryRes.status === "fulfilled" ? memoryRes.value : null);
    if (evaluationRes.status === "fulfilled") setEvaluationSummary(evaluationRes.value);
  };

  const fetchDashboard = async () => {
    setDashboardLoading(true);
    setError("");

    try {
      await checkHealth();
      const incidentList = await listIncidents(ORGANIZATION_ID);
      setIncidents(incidentList);

      const selected = incidentList.find((item) => String(item.status || "").toLowerCase() !== "resolved") || incidentList[0] || null;
      if (selected) await loadIncidentWorkspace(await getIncident(selected.id, ORGANIZATION_ID));
      else {
        setIncident(null);
        setAnalysis(null);
        setComparison(null);
        setTrajectory(null);
        setRunbooks([]);
        setMemoryItems(null);
      }
    } catch {
      setError("Backend API is unavailable. Start FastAPI and confirm the frontend API base URL is configured correctly.");
      setIncident(null);
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function init() {
      setDashboardLoading(true);
      setError("");
      try {
        await checkHealth();
        const incidentList = await listIncidents(ORGANIZATION_ID);
        if (ignore) return;
        setIncidents(incidentList);
        const selected = incidentList.find((item) => String(item.status || "").toLowerCase() !== "resolved") || incidentList[0] || null;
        if (selected) await loadIncidentWorkspace(await getIncident(selected.id, ORGANIZATION_ID));
        else setIncident(null);
      } catch (requestError) {
        if (!ignore) {
          setError(requestError ? hindsightUnavailableMessage(requestError) : "Backend API is unavailable. Start FastAPI and retry.");
          setIncident(null);
        }
      } finally {
        if (!ignore) setDashboardLoading(false);
      }
    }

    init();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleRunInvestigation() {
    if (!incident?.id) return;
    setInvestigating(true);
    setError("");
    try {
      const [newAnalysis, newComparison, newTrajectory, newMemory] = await Promise.all([
        runInvestigation(incident.id, ORGANIZATION_ID),
        compareIncident(incident.id, ORGANIZATION_ID),
        getTrajectory(incident.id, ORGANIZATION_ID),
        recallIncidentExperience(ORGANIZATION_ID, "Analyze this incident using historical engineering experience.", incident.service_id, 10),
      ]);
      setAnalysis(newAnalysis);
      setComparison(newComparison);
      setTrajectory(newTrajectory);
      setMemoryItems(newMemory);
      setInvestigationUnavailable(false);
      setComparisonUnavailable(false);
    } catch (requestError) {
      setInvestigationUnavailable(true);
      setError(hindsightUnavailableMessage(requestError));
    } finally {
      setInvestigating(false);
    }
  }

  async function handleRecordActionSubmit(actionPayload) {
    if (!incident?.id) return;
    setSubmittingAction(true);
    setError("");
    setActionNotice("");

    try {
      await recordAction(incident.id, actionPayload, ORGANIZATION_ID);
      setActionModalOpen(false);
      setActionNotice("Action recorded in investigation history. Hindsight retention is attempted by the backend and is not individually acknowledged by this API.");

      const [trajectoryResult, memoryResult] = await Promise.allSettled([
        getTrajectory(incident.id, ORGANIZATION_ID),
        recallIncidentExperience(ORGANIZATION_ID, "Analyze this incident using historical engineering experience.", incident.service_id, 10),
      ]);

      if (trajectoryResult.status === "fulfilled") setTrajectory(trajectoryResult.value);
      if (memoryResult.status === "fulfilled") setMemoryItems(memoryResult.value);
      else setMemoryItems(null);
      if (trajectoryResult.status === "rejected" || memoryResult.status === "rejected") {
        setActionNotice("Action was recorded. One or more intelligence views could not refresh; Hindsight retention is not confirmed by the current API.");
      }
    } catch {
      setError("Failed to record action into backend trajectory.");
    } finally {
      setSubmittingAction(false);
    }
  }

  const confidence = analysis?.confidence == null ? null : Math.round(Number(analysis.confidence) * 100);
  const memoryCount = analysis?.memory_count ?? (Array.isArray(memoryItems) ? memoryItems.length : null);
  const activeIncidents = incidents?.filter((item) => String(item.status || "").toLowerCase() !== "resolved").length ?? null;
  const evaluatedCount = trajectory
    ? Math.max(0, Number(trajectory.total_actions || trajectory.timeline?.length || 0) - Number(trajectory.successful_actions || 0) - Number(trajectory.failed_actions || 0))
    : null;

  return (
    <motion.div
      className="command-center-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28 }}
    >
      <div className="command-page-intro">
        <div className="command-page-intro-copy">
          <span className="command-page-kicker">ENGINEERING OPERATIONS / MEMORY-AUGMENTED RESPONSE</span>
          <span className="command-page-status"><i /> {dashboardLoading ? "SYNCING LIVE CONTEXT" : incident ? "LIVE CONTEXT READY" : "NO ACTIVE CONTEXT"}</span>
        </div>
        <button className="command-refresh-link" type="button" onClick={fetchDashboard} disabled={dashboardLoading}>
          <RefreshCw size={13} className={dashboardLoading ? "spin" : ""} /> Refresh command data
        </button>
      </div>

      <ErrorBanner message={error} onRetry={fetchDashboard} />
      {actionNotice && <div className="action-status-note command-action-note" role="status">{actionNotice}</div>}

      <CommandCenterHeader memoryCount={memoryCount} />

      <section className="why-matters panel command-difference-panel">
        <button className="why-matters-toggle" type="button" aria-expanded={whyOpen} onClick={() => setWhyOpen((open) => !open)}>
          <span>
            <span className="panel-kicker">THE RETRAX DIFFERENCE</span>
            <strong>Past incidents become decision context.</strong>
          </span>
          <span className="why-toggle-icon">{whyOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</span>
        </button>
        {whyOpen && (
          <div className="why-matters-content command-difference-content">
            <p>RETRAX brings prior incident evidence into the active investigation, makes successful and failed decisions explicit, and preserves the reasoning trail for future incidents.</p>
            <div className="why-link-grid">
              {[
                ["Remembers incidents and root causes", "memory"],
                ["Shows runbook outcomes", "runbooks"],
                ["Learns from postmortems", "postmortems"],
                ["Measures memory value", "evaluations"],
              ].map(([label, page]) => (
                <button type="button" key={page} onClick={() => onNavigate(page)}>
                  <Link size={13} />
                  <span>{label}</span>
                  <em>Explore →</em>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <MetricsGrid
        activeIncidentsCount={activeIncidents}
        memoryRecallCount={memoryCount}
        confidence={confidence}
        avoidedFailures={evaluationSummary?.incidents_with_avoided_failed_actions}
      />

      <section className="command-section-divider" aria-hidden="true"><span /> CURRENT RESPONSE <span /></section>

      {incident ? (
        <section className="workspace-grid command-workspace-grid" id="current-incident">
          <IncidentHeroPanel
            incident={incident}
            investigating={investigating}
            onRunInvestigation={handleRunInvestigation}
            onOpenWorkspace={() => onOpenWorkspace(incident.id)}
          />
          <div id="historical-reasoning">
            <ReasoningPanel analysis={analysis} confidence={confidence} unavailable={investigationUnavailable} />
          </div>
        </section>
      ) : (
        <section className="panel command-empty-state command-primary-empty">
          <div className="command-empty-index">01</div>
          <div className="panel-kicker">INCIDENT COMMAND</div>
          <div className="panel-title">{dashboardLoading ? "Loading incident context" : error ? "Live incident data is unavailable" : "No incidents to investigate"}</div>
          <p>{dashboardLoading ? "Connecting to the incident registry and loading current investigation evidence…" : error || "The incident registry returned no incidents. Refresh after new incident data is available."}</p>
        </section>
      )}

      {incident && <ComparisonPanel comparison={comparison} historicalExperience={analysis?.historical_experience || []} unavailable={comparisonUnavailable || investigationUnavailable} />}
      {incident && <PatternsPanel analysis={analysis} unavailable={investigationUnavailable} />}
      {incident && <MemoryMap incident={incident} memories={memoryItems} onOpenIncident={onOpenWorkspace} />}

      {incident && <section className="lower-grid command-action-grid">
        <DecisionTrajectory trajectory={trajectory} onRecordActionClick={() => setActionModalOpen(true)} />
        <RunbookPanel runbooks={runbooks} unavailable={runbookUnavailable} onInspectRunbooks={() => onNavigate("runbooks")} />
      </section>}

      {incident && <MemoryGrid memoryItems={memoryItems} />}

      {incident && <LearningLoop
        onStep={(target) => {
          if (target === "postmortems" || target === "incidents") return onNavigate(target);
          if (target === "action-form") return setActionModalOpen(true);
          document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
        counts={{
          incidents: incidents?.filter((item) => String(item.status || "").toLowerCase() === "resolved").length ?? null,
          memories: memoryCount,
          current: incident ? 1 : null,
          reasoning: analysis?.historical_experience?.length ?? comparison?.similarities?.length ?? null,
          actions: trajectory?.total_actions ?? trajectory?.timeline?.length ?? null,
          outcomes: trajectory ? Number(trajectory.successful_actions || 0) + Number(trajectory.failed_actions || 0) : null,
          learning: evaluatedCount,
        }}
      />}

      {incident && <EngineerActionModal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        onSubmit={handleRecordActionSubmit}
        submitting={submittingAction}
      />}
    </motion.div>
  );
}
