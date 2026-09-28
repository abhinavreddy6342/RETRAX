import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  RefreshCw,
  ChevronRight,
  GitCompareArrows,
  Route,
  Loader2,
  Clock,
  Server,
  Info,
  Sparkles,
} from "lucide-react";
import { IncidentAgentChat } from "../components/incident-workspace/IncidentAgentChat";
import { getIncident, resolveServiceName } from "../api/incidents";
import {
  runInvestigation,
  compareIncident,
  getTrajectory,
  recordAction,
} from "../api/investigations";

function fmt(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

function SevBadge({ sev }) {
  const colors = {
    "SEV-1": { bg: "rgba(255,80,80,0.08)", border: "rgba(255,80,80,0.25)", color: "#ff8585" },
    "SEV-2": { bg: "rgba(255,173,79,0.08)", border: "rgba(255,173,79,0.25)", color: "#ffb766" },
    "SEV-3": { bg: "rgba(255,225,141,0.06)", border: "rgba(255,225,141,0.2)", color: "#ffe18d" },
  };
  const s = colors[sev] || { bg: "rgba(140,178,189,0.06)", border: "rgba(140,178,189,0.18)", color: "#92b1b9" };
  return (
    <span
      style={{
        padding: "3px 9px",
        borderRadius: 99,
        border: `1px solid ${s.border}`,
        background: s.bg,
        color: s.color,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.1em",
      }}
    >
      {sev || "SEV-?"}
    </span>
  );
}

function PatternList({ items, variant }) {
  if (!items || items.length === 0) return (
    <p style={{ color: "#4e6268", fontSize: 12, fontStyle: "italic", margin: 0 }}>None recorded.</p>
  );
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((p, i) => (
        <li key={i} style={{
          display: "flex", gap: 8, alignItems: "flex-start",
          fontSize: 12, color: variant === "success" ? "#6ee6a4" : variant === "failed" ? "#ff8585" : "#ffc98e",
          lineHeight: 1.5,
        }}>
          {variant === "success" ? <CheckCircle2 size={13} style={{ marginTop: 2, flexShrink: 0 }} /> :
           variant === "failed" ? <XCircle size={13} style={{ marginTop: 2, flexShrink: 0 }} /> :
           <AlertTriangle size={13} style={{ marginTop: 2, flexShrink: 0 }} />}
          {p}
        </li>
      ))}
    </ul>
  );
}

function TrajStep({ step, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      style={{
        display: "flex", gap: 12, alignItems: "flex-start",
        paddingBottom: 16, borderBottom: "1px solid rgba(140,178,189,0.07)",
      }}
    >
      <div style={{
        width: 26, height: 26, flexShrink: 0, borderRadius: "50%",
        background: "rgba(85,221,239,0.07)", border: "1px solid rgba(85,221,239,0.2)",
        display: "grid", placeItems: "center", color: "#64deef", fontSize: 11, fontWeight: 700,
      }}>
        {index + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "#a4c2ca", fontWeight: 600, marginBottom: 2 }}>
          {step.action_type || step.step || "Action"}
        </div>
        <div style={{ fontSize: 12, color: "#6a868e", lineHeight: 1.5 }}>
          {step.description || step.reasoning || step.result || "—"}
        </div>
        {step.operator && (
          <div style={{ fontSize: 10, color: "#4a5f66", marginTop: 3 }}>
            by {step.operator}
          </div>
        )}
        {step.recorded_at && (
          <div style={{ fontSize: 10, color: "#3e5258", marginTop: 2 }}>
            {fmt(step.recorded_at)}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function IncidentWorkspacePage({ incidentId, onNavigate }) {
  const [incident, setIncident] = useState(null);
  const [investigation, setInvestigation] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [trajectory, setTrajectory] = useState(null);

  const [loadingIncident, setLoadingIncident] = useState(true);
  const [loadingInvestigation, setLoadingInvestigation] = useState(false);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [loadingTrajectory, setLoadingTrajectory] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  const [error, setError] = useState(null);
  const [actionForm, setActionForm] = useState({ action_type: "", description: "", outcome: "success" });
  const [actionSuccess, setActionSuccess] = useState(false);
  const [actionError, setActionError] = useState("");
  const [activeTab, setActiveTab] = useState("agent");

  const fetchIncident = useCallback(async () => {
    if (!incidentId) return;
    setLoadingIncident(true);
    setError(null);
    try {
      const data = await getIncident(incidentId);
      setIncident(data);
    } catch {
      setError("Failed to load incident.");
    } finally {
      setLoadingIncident(false);
    }
  }, [incidentId]);

  const fetchInvestigation = useCallback(async () => {
    if (!incidentId) return;
    setLoadingInvestigation(true);
    try {
      const data = await runInvestigation(incidentId);
      setInvestigation(data);
    } catch {
      setInvestigation(null);
    } finally {
      setLoadingInvestigation(false);
    }
  }, [incidentId]);

  const fetchComparison = useCallback(async () => {
    if (!incidentId) return;
    setLoadingComparison(true);
    try {
      const data = await compareIncident(incidentId);
      setComparison(data);
    } catch {
      setComparison(null);
    } finally {
      setLoadingComparison(false);
    }
  }, [incidentId]);

  const fetchTrajectory = useCallback(async () => {
    if (!incidentId) return;
    setLoadingTrajectory(true);
    try {
      const data = await getTrajectory(incidentId);
      setTrajectory(data);
    } catch {
      setTrajectory(null);
    } finally {
      setLoadingTrajectory(false);
    }
  }, [incidentId]);

  useEffect(() => {
    if (!incidentId) return;
    let ignore = false;

    async function load() {
      setLoadingIncident(true);
      setError(null);
      try {
        const data = await getIncident(incidentId);
        if (!ignore) setIncident(data);
      } catch {
        if (!ignore) setError("Failed to load incident.");
      } finally {
        if (!ignore) setLoadingIncident(false);
      }

      // Run investigation and trajectory in parallel
      setLoadingInvestigation(true);
      setLoadingTrajectory(true);
      const [inv, traj] = await Promise.allSettled([
        runInvestigation(incidentId),
        getTrajectory(incidentId),
      ]);
      if (!ignore) {
        setInvestigation(inv.status === "fulfilled" ? inv.value : null);
        setTrajectory(traj.status === "fulfilled" ? traj.value : null);
        setLoadingInvestigation(false);
        setLoadingTrajectory(false);
      }
    }

    load();
    return () => { ignore = true; };
  }, [incidentId]);

  const handleRecordAction = async (e) => {
    e.preventDefault();
    if (!actionForm.action_type.trim()) return;
    setSubmittingAction(true);
    setActionError("");
    try {
      await recordAction(incidentId, {
        action: actionForm.action_type.trim(),
        result: actionForm.outcome === "failed" ? "failure" : actionForm.outcome === "partial" ? "inconclusive" : "success",
        reason: actionForm.description.trim() || null,
        evidence: [],
      });
      setActionSuccess(true);
      setActionForm({ action_type: "", description: "", outcome: "success" });
      await fetchTrajectory();
    } catch (requestError) {
      setActionError(requestError?.response?.data?.detail || "Could not record this action in the investigation trail.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const prepareActionForReview = (action) => {
    setActionForm({ action_type: action, description: "", outcome: "inconclusive" });
    document.getElementById("action-recorder")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (loadingIncident) {
    return (
      <div className="content-wrap" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "120px 34px" }}>
        <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "#55ddef" }} />
        <p style={{ color: "#5e747c", marginTop: 16 }}>Loading incident workspace…</p>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="content-wrap">
        <div className="alert-banner">
          <div className="alert-content"><AlertTriangle size={16} /> {error || "Incident not found."}</div>
          <button className="alert-retry-btn" onClick={fetchIncident}><RefreshCw size={12} /> Retry</button>
        </div>
      </div>
    );
  }

  const steps = trajectory?.steps || trajectory?.actions || trajectory?.trajectory || [];

  return (
    <div className="content-wrap" style={{ maxWidth: 1480, padding: "36px 34px 60px" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 11, letterSpacing: "0.12em", color: "#4e6268" }}>
        <span style={{ cursor: "pointer", color: "#5c787f" }} onClick={() => onNavigate("incidents")}>INCIDENTS</span>
        <ChevronRight size={12} />
        <span style={{ color: "#8de7f8" }}>WAR ROOM · {incident.incident_key}</span>
      </div>

      {/* Workspace Grid */}
      <div className="incident-workspace-layout" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(380px, 460px)", gap: 20, alignItems: "start" }}>

        {/* LEFT: Incident Context */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Incident Header Panel */}
          <motion.div
            className="panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ borderRadius: 12, padding: "22px 24px" }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <SevBadge sev={incident.severity} />
                  <span className="status-badge status-investigating" style={{ fontSize: 10 }}>
                    <span className="status-badge-dot" />
                    {incident.status?.toUpperCase() || "OPEN"}
                  </span>
                  <span style={{ fontSize: 10, letterSpacing: "0.12em", color: "#4e6268", fontWeight: 700 }}>
                    {incident.incident_key}
                  </span>
                </div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#e9f4f7", lineHeight: 1.3 }}>
                  {incident.title}
                </h2>
                {incident.description && (
                  <p style={{ margin: "10px 0 0", color: "#6e8991", fontSize: 13, lineHeight: 1.65, maxWidth: 620 }}>
                    {incident.description}
                  </p>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(140,178,189,0.1)", fontSize: 12, color: "#8aa5ad" }}>
                  <Server size={13} />
                  {incident.service_name || resolveServiceName(incident.service_id)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(140,178,189,0.1)", fontSize: 12, color: "#8aa5ad" }}>
                  <Clock size={13} />
                  {fmt(incident.created_at)}
                </div>
              </div>
            </div>

            {/* Failure Signal */}
            {incident.current_error && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#5e737a", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                  <Info size={11} /> FAILURE SIGNAL
                </div>
                <div className="code-box" style={{ fontSize: 12 }}>{incident.current_error}</div>
              </div>
            )}

            {/* Impact */}
            {incident.impact && (
              <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 8, background: "rgba(255,173,79,0.04)", border: "1px solid rgba(255,173,79,0.15)" }}>
                <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#8a6440", marginBottom: 5 }}>IMPACT</div>
                <div style={{ fontSize: 12, color: "#d4a265", lineHeight: 1.6 }}>{incident.impact}</div>
              </div>
            )}
          </motion.div>

          {/* Action Recorder */}
          <motion.div
            className="panel"
            id="action-recorder"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{ borderRadius: 12, padding: "20px 24px" }}
          >
            <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#5a737c", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <Send size={12} /> RECORD OPERATOR ACTION
            </div>
            <AnimatePresence>
              {actionSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 8, background: "rgba(110,230,164,0.06)", border: "1px solid rgba(110,230,164,0.2)", color: "#6ee6a4", fontSize: 12, display: "flex", gap: 8, alignItems: "center" }}
                >
                  <CheckCircle2 size={14} /> Action recorded in the investigation trajectory. Hindsight learning is best-effort and may take a moment to become available.
                </motion.div>
              )}
            </AnimatePresence>
            {actionError && <div className="alert-banner" role="alert"><AlertTriangle size={14} /> {actionError}</div>}
            <form onSubmit={handleRecordAction} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input
                  className="search-input"
                  placeholder="Action type (e.g. restart_service)"
                  value={actionForm.action_type}
                  onChange={(e) => setActionForm(f => ({ ...f, action_type: e.target.value }))}
                  style={{ padding: "0 12px" }}
                />
                <select
                  className="filter-select"
                  value={actionForm.outcome}
                  onChange={(e) => setActionForm(f => ({ ...f, outcome: e.target.value }))}
                  style={{ paddingLeft: 12, width: "100%" }}
                >
                  <option value="success">Outcome: Success</option>
                  <option value="failed">Outcome: Failed</option>
                  <option value="partial">Outcome: Partial</option>
                </select>
              </div>
              <textarea
                className="search-input"
                placeholder="Describe what was done and observed…"
                rows={2}
                value={actionForm.description}
                onChange={(e) => setActionForm(f => ({ ...f, description: e.target.value }))}
                style={{ padding: "10px 12px", height: "auto", resize: "vertical" }}
              />
              <button
                type="submit"
                disabled={submittingAction || !actionForm.action_type.trim()}
                style={{
                  alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", borderRadius: 8, background: "#64deef", color: "#041014",
                  fontWeight: 700, fontSize: 12, cursor: submittingAction ? "not-allowed" : "pointer",
                  opacity: !actionForm.action_type.trim() ? 0.5 : 1,
                  border: 0,
                }}
              >
                {submittingAction ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={13} />}
                Record investigation action
              </button>
            </form>
          </motion.div>

          {/* Decision Trajectory */}
          <motion.div
            className="panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{ borderRadius: 12, padding: "20px 24px" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#5a737c", display: "flex", alignItems: "center", gap: 6 }}>
                <Route size={12} /> DECISION TRAJECTORY
              </div>
              <button
                onClick={fetchTrajectory}
                disabled={loadingTrajectory}
                style={{ background: "transparent", border: 0, color: "#5a737c", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}
              >
                {loadingTrajectory ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={12} />}
                Refresh
              </button>
            </div>
            {loadingTrajectory ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center", color: "#4e6268", fontSize: 12 }}>
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Loading trajectory…
              </div>
            ) : steps.length === 0 ? (
              <p style={{ color: "#4e6268", fontSize: 12, fontStyle: "italic", margin: 0 }}>No trajectory steps recorded yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {steps.map((s, i) => <TrajStep key={i} step={s} index={i} />)}
              </div>
            )}
          </motion.div>
        </div>

        {/* RIGHT: Hindsight Intelligence Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Agent-led incident console */}
          <div className="workspace-agent-tabs" role="tablist" aria-label="Incident intelligence views">
            {[
              { key: "agent", label: "Agent", icon: Sparkles },
              { key: "investigation", label: "Investigation", icon: BrainCircuit },
              { key: "comparison", label: "Comparison", icon: GitCompareArrows },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                role="tab"
                aria-selected={activeTab === key}
                onClick={() => {
                  setActiveTab(key);
                  if (key === "comparison" && !comparison) fetchComparison();
                }}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  padding: "9px 8px", borderRadius: 8, border: 0, fontSize: 11, fontWeight: 600,
                  cursor: "pointer", transition: "all 0.2s ease",
                  background: activeTab === key ? "rgba(85,221,239,0.12)" : "transparent",
                  color: activeTab === key ? "#6de8f7" : "#82969c",
                }}
              >
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "agent" && (
              <motion.div key="agent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <IncidentAgentChat incident={incident} onPrepareAction={prepareActionForReview} />
              </motion.div>
            )}
            {activeTab === "investigation" && (
              <motion.div key="inv" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                  {/* Hindsight header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10, letterSpacing: "0.14em", color: "#4e8898" }}>
                      <BrainCircuit size={13} /> HINDSIGHT INTELLIGENCE
                    </div>
                    <button
                      onClick={fetchInvestigation}
                      disabled={loadingInvestigation}
                      style={{ background: "transparent", border: 0, color: "#4e6268", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}
                    >
                      {loadingInvestigation ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Zap size={12} />}
                      {loadingInvestigation ? "Investigating…" : "Re-run"}
                    </button>
                  </div>

                  {loadingInvestigation && !investigation ? (
                    <div className="panel" style={{ borderRadius: 12, padding: "20px 18px", display: "flex", gap: 10, alignItems: "center", color: "#5a737c", fontSize: 12 }}>
                      <Loader2 size={16} style={{ animation: "spin 1s linear infinite", color: "#55ddef" }} />
                      Hindsight is analyzing memory for this incident…
                    </div>
                  ) : investigation ? (
                    <>
                      {/* Reasoning */}
                      <div className="panel" style={{ borderRadius: 12, padding: "16px 18px" }}>
                        <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#5a737c", marginBottom: 8 }}>REASONING</div>
                        <p style={{ margin: 0, color: "#c4d7dc", fontSize: 12, lineHeight: 1.7 }}>
                          {investigation.reasoning || investigation.analysis || "No reasoning provided."}
                        </p>
                        {investigation.root_cause && (
                          <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(255,173,79,0.05)", border: "1px solid rgba(255,173,79,0.15)", fontSize: 12, color: "#d4a265" }}>
                            <strong style={{ color: "#c99658", display: "block", marginBottom: 3, fontSize: 10, letterSpacing: "0.12em" }}>ROOT CAUSE</strong>
                            {investigation.root_cause}
                          </div>
                        )}
                        {investigation.confidence !== undefined && (
                          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ fontSize: 10, color: "#4e6268", letterSpacing: "0.12em" }}>CONFIDENCE</div>
                            <div style={{ flex: 1, height: 4, borderRadius: 999, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${(investigation.confidence * 100).toFixed(0)}%`, background: "#55ddef", borderRadius: 999, transition: "width 0.8s ease" }} />
                            </div>
                            <span style={{ fontSize: 11, color: "#6de8f7", fontWeight: 700 }}>{(investigation.confidence * 100).toFixed(0)}%</span>
                          </div>
                        )}
                        {investigation.memory_count !== undefined && (
                          <div style={{ marginTop: 6, fontSize: 10, color: "#4a6068" }}>
                            Recalled {investigation.memory_count} memory records from Hindsight
                          </div>
                        )}
                      </div>

                      {/* Successful Patterns */}
                      <div className="panel" style={{ borderRadius: 12, padding: "16px 18px" }}>
                        <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#4a7060", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                          <CheckCircle2 size={11} /> SUCCESSFUL PATTERNS
                        </div>
                        <PatternList items={investigation.successful_patterns} variant="success" />
                      </div>

                      {/* Failed Patterns */}
                      <div className="panel" style={{ borderRadius: 12, padding: "16px 18px" }}>
                        <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#7a4a4a", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                          <XCircle size={11} /> FAILED PATTERNS
                        </div>
                        <PatternList items={investigation.failed_patterns} variant="failed" />
                      </div>

                      {/* Warnings */}
                      {investigation.warnings && investigation.warnings.length > 0 && (
                        <div className="panel" style={{ borderRadius: 12, padding: "16px 18px" }}>
                          <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#7a6040", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                            <AlertTriangle size={11} /> WARNINGS
                          </div>
                          <PatternList items={investigation.warnings} variant="warning" />
                        </div>
                      )}

                      {/* Recommended Actions */}
                      {investigation.recommended_actions && investigation.recommended_actions.length > 0 && (
                        <div className="panel" style={{ borderRadius: 12, padding: "16px 18px" }}>
                          <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#5a737c", marginBottom: 8 }}>RECOMMENDED ACTIONS</div>
                          <ol style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                            {investigation.recommended_actions.map((a, i) => (
                              <li key={i} style={{ fontSize: 12, color: "#a4c2ca", lineHeight: 1.5 }}>{a}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="panel" style={{ borderRadius: 12, padding: "20px 18px", fontSize: 12, color: "#4e6268" }}>
                      No investigation data. Click Re-run to invoke Hindsight.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "comparison" && (
              <motion.div key="cmp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#4e8898", display: "flex", alignItems: "center", gap: 7 }}>
                      <GitCompareArrows size={13} /> INCIDENT COMPARISON
                    </div>
                    <button
                      onClick={fetchComparison}
                      disabled={loadingComparison}
                      style={{ background: "transparent", border: 0, color: "#4e6268", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}
                    >
                      {loadingComparison ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={12} />}
                      Refresh
                    </button>
                  </div>

                  {loadingComparison && !comparison ? (
                    <div className="panel" style={{ borderRadius: 12, padding: "20px 18px", display: "flex", gap: 10, alignItems: "center", color: "#5a737c", fontSize: 12 }}>
                      <Loader2 size={16} style={{ animation: "spin 1s linear infinite", color: "#55ddef" }} />
                      Querying Hindsight for similar past incidents…
                    </div>
                  ) : comparison ? (
                    <>
                      {comparison.similarities && comparison.similarities.length > 0 && (
                        <div className="panel" style={{ borderRadius: 12, padding: "16px 18px" }}>
                          <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#5a737c", marginBottom: 8 }}>SIMILARITIES TO PAST INCIDENTS</div>
                          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                            {comparison.similarities.map((s, i) => (
                              <li key={i} style={{ fontSize: 12, color: "#a4c2ca", lineHeight: 1.5, display: "flex", gap: 7, alignItems: "flex-start" }}>
                                <span style={{ color: "#55ddef", marginTop: 2, flexShrink: 0 }}>·</span> {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {comparison.differences && comparison.differences.length > 0 && (
                        <div className="panel" style={{ borderRadius: 12, padding: "16px 18px" }}>
                          <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#5a737c", marginBottom: 8 }}>KEY DIFFERENCES</div>
                          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                            {comparison.differences.map((d, i) => (
                              <li key={i} style={{ fontSize: 12, color: "#a4c2ca", lineHeight: 1.5, display: "flex", gap: 7, alignItems: "flex-start" }}>
                                <span style={{ color: "#ffa94d", marginTop: 2, flexShrink: 0 }}>·</span> {d}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {comparison.recommended_actions && comparison.recommended_actions.length > 0 && (
                        <div className="panel" style={{ borderRadius: 12, padding: "16px 18px" }}>
                          <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#5a737c", marginBottom: 8 }}>RECOMMENDED ACTIONS</div>
                          <ol style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                            {comparison.recommended_actions.map((a, i) => (
                              <li key={i} style={{ fontSize: 12, color: "#a4c2ca", lineHeight: 1.5 }}>{a}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="panel" style={{ borderRadius: 12, padding: "20px 18px", fontSize: 12, color: "#4e6268" }}>
                      No comparison data yet. Click Refresh to run comparison via Hindsight.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .workspace-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
