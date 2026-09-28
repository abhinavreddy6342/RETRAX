import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Workflow,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Star,
  XCircle,
  Clock,
  Play,
  ListChecks,
} from "lucide-react";
import { listRunbooks, getRunbookExperience, executeRunbook } from "../api/runbooks";
import { listIncidents } from "../api/incidents";

function RiskBadge({ risk }) {
  const colors = {
    low: { bg: "rgba(110,230,164,0.06)", border: "rgba(110,230,164,0.2)", color: "#6ee6a4" },
    medium: { bg: "rgba(255,225,141,0.06)", border: "rgba(255,225,141,0.2)", color: "#ffe18d" },
    high: { bg: "rgba(255,133,133,0.06)", border: "rgba(255,133,133,0.2)", color: "#ff8585" },
  };
  const s = colors[risk?.toLowerCase()] || colors.low;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
      padding: "2px 7px", borderRadius: 99,
      border: `1px solid ${s.border}`, color: s.color, background: s.bg,
    }}>
      {(risk || "LOW").toUpperCase()}
    </span>
  );
}

function RunbookCard({ runbook, experience, expLoading, onExpand, expanded, onEvaluate, evaluating, evaluation, evaluationError, incidentSelected }) {
  const successRate = experience?.success_rate != null
    ? `${(experience.success_rate * 100).toFixed(0)}%`
    : null;

  return (
    <motion.div
      className="panel"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ borderRadius: 12, overflow: "hidden" }}
    >
      {/* Card Header */}
      <div style={{ padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#4e8898", marginBottom: 5, display: "flex", alignItems: "center", gap: 5 }}>
              <Workflow size={11} /> {runbook.runbook_key}
            </div>
            <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "#e9f4f7" }}>
              {runbook.name}
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: "#6e8991", lineHeight: 1.6 }}>
              {runbook.description}
            </p>
          </div>

          {/* Experience Metrics */}
          {expLoading ? (
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite", color: "#55ddef", flexShrink: 0, marginTop: 4 }} />
          ) : experience ? (
            <div style={{ flexShrink: 0, textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: successRate === "100%" ? "#6ee6a4" : "#ffe18d", lineHeight: 1 }}>
                {successRate}
              </div>
              <div style={{ fontSize: 9, color: "#4e6268", letterSpacing: "0.12em", marginTop: 2 }}>SUCCESS RATE</div>
              <div style={{ fontSize: 10, color: "#4e6268", marginTop: 4 }}>
                {experience.executions} run{experience.executions !== 1 ? "s" : ""}
              </div>
            </div>
          ) : null}
        </div>

        {/* Experience Meta Row */}
        {experience && (
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6ee6a4" }}>
              <CheckCircle2 size={11} /> {experience.successful_executions} successes
            </div>
            {experience.failed_executions > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#ff8585" }}>
                <XCircle size={11} /> {experience.failed_executions} failures
              </div>
            )}
            {experience.last_executed_at && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#4e6268" }}>
                <Clock size={11} /> Last: {new Date(experience.last_executed_at).toLocaleDateString()}
              </div>
            )}
          </div>
        )}

        {/* Expand Toggle */}
        <button
          onClick={onExpand}
          style={{
            marginTop: 14, display: "flex", alignItems: "center", gap: 5,
            background: "transparent", border: 0, color: "#5a737c", cursor: "pointer",
            fontSize: 11, padding: 0,
          }}
        >
          <ListChecks size={12} />
          {expanded ? "Hide" : "Show"} steps ({runbook.steps?.length || 0})
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Steps */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ borderTop: "1px solid rgba(140,178,189,0.1)", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              {(runbook.steps || []).map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{
                    width: 22, height: 22, flexShrink: 0, borderRadius: "50%",
                    background: "rgba(85,221,239,0.07)", border: "1px solid rgba(85,221,239,0.2)",
                    display: "grid", placeItems: "center", color: "#64deef", fontSize: 10, fontWeight: 700,
                  }}>
                    {step.order}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#c4d7dc" }}>{step.title}</span>
                      <RiskBadge risk={step.risk_level} />
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: "#6e8991", lineHeight: 1.5 }}>{step.instruction}</p>
                    {step.command && (
                      <div className="code-box" style={{ marginTop: 8, fontSize: 11, color: "#a4c2ca" }}>
                        <span style={{ display: "block", marginBottom: 6, color: "#8da3aa", fontFamily: "inherit" }}>Command preview · not executed</span>
                        $ {step.command}
                      </div>
                    )}
                    {step.expected_result && (
                      <div style={{ marginTop: 6, fontSize: 11, color: "#4e8070", fontStyle: "italic" }}>
                        Expected: {step.expected_result}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="runbook-evaluation-row">
        <button className="secondary-button" onClick={() => onEvaluate(runbook)} disabled={!incidentSelected || evaluating}>
          {evaluating ? <Loader2 size={14} className="spin" /> : <Play size={14} />}
          {evaluating ? "Evaluating plan…" : "Evaluate plan safely"}
        </button>
        <span>Validates and records the plan. RETRAX does not run infrastructure commands.</span>
      </div>
      {evaluationError && <div className="runbook-evaluation-result is-error">{evaluationError}</div>}
      {evaluation && (
        <div className="runbook-evaluation-result">
          <strong>{evaluation.status || "Evaluation recorded"}</strong>
          <span>{evaluation.summary}</span>
          {evaluation.evidence?.length > 0 && <ul>{evaluation.evidence.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>}
        </div>
      )}

      {/* Success/Failure Conditions from Experience */}
      {experience && (experience.common_success_conditions?.length > 0 || experience.common_failure_conditions?.length > 0) && (
        <div style={{ borderTop: "1px solid rgba(140,178,189,0.08)", padding: "14px 20px", display: "flex", gap: 12, flexWrap: "wrap", background: "rgba(255,255,255,0.01)" }}>
          {experience.common_success_conditions?.length > 0 && (
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.14em", color: "#4a7060", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                <Star size={9} /> KNOWN SUCCESS CONDITIONS
              </div>
              {experience.common_success_conditions.map((c, i) => (
                <div key={i} style={{ fontSize: 11, color: "#6ee6a4", lineHeight: 1.5, display: "flex", gap: 5, alignItems: "flex-start", marginBottom: 3 }}>
                  <CheckCircle2 size={10} style={{ marginTop: 2, flexShrink: 0 }} /> {c}
                </div>
              ))}
            </div>
          )}
          {experience.common_failure_conditions?.length > 0 && (
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.14em", color: "#7a4a4a", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                <AlertTriangle size={9} /> KNOWN FAILURE CONDITIONS
              </div>
              {experience.common_failure_conditions.map((c, i) => (
                <div key={i} style={{ fontSize: 11, color: "#ff8585", lineHeight: 1.5, display: "flex", gap: 5, alignItems: "flex-start", marginBottom: 3 }}>
                  <XCircle size={10} style={{ marginTop: 2, flexShrink: 0 }} /> {c}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Warnings from experience */}
      {experience?.warnings?.length > 0 && (
        <div style={{ borderTop: "1px solid rgba(140,178,189,0.08)", padding: "12px 20px", background: "rgba(255,173,79,0.02)" }}>
          {experience.warnings.map((w, i) => (
            <div key={i} style={{ fontSize: 11, color: "#ffa94d", display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 3 }}>
              <AlertTriangle size={10} style={{ marginTop: 2, flexShrink: 0 }} /> {w}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export function RunbooksPage() {
  const [runbooks, setRunbooks] = useState([]);
  const [experiences, setExperiences] = useState({});
  const [expLoading, setExpLoading] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [evaluating, setEvaluating] = useState({});
  const [evaluations, setEvaluations] = useState({});
  const [evaluationErrors, setEvaluationErrors] = useState({});

  async function fetchRunbooks() {
    setLoading(true);
    setError(null);
    try {
      const [data, incidentData] = await Promise.all([
        listRunbooks(),
        listIncidents().catch(() => []),
      ]);
      setRunbooks(Array.isArray(data) ? data : []);
      const availableIncidents = Array.isArray(incidentData) ? incidentData : [];
      setIncidents(availableIncidents);
      setSelectedIncidentId((current) => current || availableIncidents.find((item) => String(item.status || "").toLowerCase() !== "resolved")?.id || availableIncidents[0]?.id || "");
    } catch {
      setError("Failed to load runbooks.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [data, incidentData] = await Promise.all([
          listRunbooks(),
          listIncidents().catch(() => []),
        ]);
        if (!ignore) {
          setRunbooks(Array.isArray(data) ? data : []);
          const availableIncidents = Array.isArray(incidentData) ? incidentData : [];
          setIncidents(availableIncidents);
          setSelectedIncidentId((current) => current || availableIncidents.find((item) => String(item.status || "").toLowerCase() !== "resolved")?.id || availableIncidents[0]?.id || "");
        }
      } catch {
        if (!ignore) setError("Failed to load runbooks.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, []);

  // Fetch experience for each runbook once loaded
  useEffect(() => {
    if (runbooks.length === 0) return;
    runbooks.forEach(async (rb) => {
      const id = rb.id || rb.runbook_id;
      if (!id) return;
      setExpLoading(prev => ({ ...prev, [id]: true }));
      try {
        const exp = await getRunbookExperience(id);
        setExperiences(prev => ({ ...prev, [id]: exp }));
      } catch {
        // silently ignore
      } finally {
        setExpLoading(prev => ({ ...prev, [id]: false }));
      }
    });
  }, [runbooks]);

  async function handleEvaluate(runbook) {
    const runbookId = runbook.id || runbook.runbook_id;
    if (!selectedIncidentId || !runbookId) return;
    setEvaluating((current) => ({ ...current, [runbookId]: true }));
    setEvaluationErrors((current) => ({ ...current, [runbookId]: "" }));
    try {
      const result = await executeRunbook({
        incident_id: selectedIncidentId,
        runbook_id: runbookId,
        step_orders: (runbook.steps || []).map((step) => step.order),
        notes: "Runbook plan evaluated from the RETRAX catalog.",
      });
      setEvaluations((current) => ({ ...current, [runbookId]: result }));
      try {
        const experience = await getRunbookExperience(runbookId);
        setExperiences((current) => ({ ...current, [runbookId]: experience }));
      } catch {
        // The persisted evaluation result remains useful if metrics refresh is unavailable.
      }
    } catch (err) {
      setEvaluationErrors((current) => ({
        ...current,
        [runbookId]: err?.response?.data?.detail || "Runbook plan evaluation failed.",
      }));
    } finally {
      setEvaluating((current) => ({ ...current, [runbookId]: false }));
    }
  }

  const totalRuns = Object.values(experiences).reduce((s, e) => s + (e?.executions || 0), 0);
  const totalSuccess = Object.values(experiences).reduce((s, e) => s + (e?.successful_executions || 0), 0);
  const avgSuccessRate = totalRuns > 0 ? ((totalSuccess / totalRuns) * 100).toFixed(0) : "—";

  return (
    <div className="content-wrap" style={{ maxWidth: 1100, padding: "36px 34px 60px" }}>
      {/* Header */}
      <motion.div
        className="hero-row"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 28 }}
      >
        <div>
          <div className="eyebrow">RUNBOOK EXPERIENCE</div>
          <h1 style={{ fontFamily: "Audiowide, sans-serif", fontSize: "clamp(24px, 3vw, 38px)", margin: "0 0 10px", color: "#e9f4f7" }}>
            Runbooks Catalog
          </h1>
          <p style={{ margin: 0, color: "#6e8991", fontSize: 14, lineHeight: 1.6 }}>
            Recovery runbooks enriched with Hindsight experience metrics — success rates, known conditions, and field-tested warnings.
          </p>
        </div>
        <button
          onClick={fetchRunbooks}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "10px 16px", borderRadius: 9, border: "1px solid rgba(140,178,189,0.15)",
            background: "rgba(255,255,255,0.03)", color: "#8aa5ad", fontSize: 12,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={14} />}
          Refresh
        </button>
      </motion.div>

      <div className="runbook-incident-select">
        <label htmlFor="runbook-incident">Evaluate against incident</label>
        <select id="runbook-incident" value={selectedIncidentId} onChange={(event) => setSelectedIncidentId(event.target.value)} disabled={!incidents.length}>
          {incidents.length === 0 ? <option value="">No incidents available</option> : incidents.map((incident) => (
            <option key={incident.id} value={incident.id}>{incident.incident_key || incident.id} · {incident.title}</option>
          ))}
        </select>
      </div>

      {/* Summary Metrics */}
      {!loading && runbooks.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}
        >
          {[
            { label: "TOTAL RUNBOOKS", value: runbooks.length, icon: Workflow },
            { label: "TOTAL EXECUTIONS", value: totalRuns, icon: Play },
            { label: "AVG SUCCESS RATE", value: `${avgSuccessRate}%`, icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="metric-card" style={{ borderRadius: 11, padding: "16px 18px", minHeight: "auto" }}>
              <div className="metric-icon" style={{ width: 32, height: 32 }}>
                <Icon size={15} />
              </div>
              <div className="metric-main">
                <div className="metric-label">{label}</div>
                <div className="metric-value" style={{ fontSize: 24 }}>{value}</div>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <div className="alert-banner" style={{ marginBottom: 20 }}>
          <div className="alert-content"><AlertTriangle size={15} /> {error}</div>
          <button className="alert-retry-btn" onClick={fetchRunbooks}><RefreshCw size={12} /> Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", gap: 14 }}>
          <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "#55ddef" }} />
          <p style={{ color: "#5e747c", fontSize: 13, margin: 0 }}>Loading runbooks…</p>
        </div>
      )}

      {/* Runbook List */}
      {!loading && runbooks.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#4e6268" }}>
          <Workflow size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p style={{ margin: 0 }}>No runbooks found.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {runbooks.map((rb, i) => {
          const id = rb.id || rb.runbook_id;
          return (
            <RunbookCard
              key={id || i}
              runbook={rb}
              experience={experiences[id]}
              expLoading={expLoading[id]}
              expanded={expanded[id] || false}
              onEvaluate={handleEvaluate}
              evaluating={evaluating[id] || false}
              evaluation={evaluations[id]}
              evaluationError={evaluationErrors[id]}
              incidentSelected={Boolean(selectedIncidentId)}
              onExpand={() => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))}
            />
          );
        })}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
