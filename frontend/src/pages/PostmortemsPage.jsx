import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Loader2,
  AlertTriangle,
  RefreshCw,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Sparkles,
  ListChecks,
  Shield,
} from "lucide-react";
import { listIncidents } from "../api/incidents";
import { getPostmortem, learnFromPostmortem, getLearningStatus } from "../api/postmortems";
import { ORGANIZATION_ID } from "../api/client";

const SERVICE_MAP = {
  "ff6b2fa0-7c88-4679-ba6b-bfabb5e7f68a": "Payments API",
  "0071b1a4-cbda-4a5e-bc38-59f6d0b36de7": "Checkout Service",
};
function resolveService(id) {
  return id ? (SERVICE_MAP[id] || id.slice(0, 8) + "…") : "Unknown";
}
function fmt(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return ts; }
}

function PostmortemDetail({ incidentId }) {
  const [postmortem, setPostmortem] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [learning, setLearning] = useState(false);
  const [learnDone, setLearnDone] = useState(false);
  const [learnResult, setLearnResult] = useState(null);
  const [error, setError] = useState(null);

  async function fetchAll() {
    if (!incidentId) return;
    setLoading(true);
    setError(null);
    try {
      const [pm, st] = await Promise.all([
        getPostmortem(incidentId).catch(() => null),
        getLearningStatus(incidentId).catch(() => null),
      ]);
      setPostmortem(pm);
      setStatus(st);
    } catch {
      setError("Failed to load postmortem data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!incidentId) return;
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [pm, st] = await Promise.all([
          getPostmortem(incidentId).catch(() => null),
          getLearningStatus(incidentId).catch(() => null),
        ]);
        if (!ignore) {
          setPostmortem(pm);
          setStatus(st);
        }
      } catch {
        if (!ignore) setError("Failed to load postmortem data.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [incidentId]);

  const handleLearn = async () => {
    setLearning(true);
    try {
      const result = await learnFromPostmortem(incidentId);
      setLearnResult(result);
      setLearnDone(true);
      fetchAll();
    } catch (err) {
      setError("Learning trigger failed: " + (err?.response?.data?.detail || err?.message || "Unknown error"));
    } finally {
      setLearning(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center", color: "#4e6268", fontSize: 12, padding: "20px 0" }}>
        <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Loading postmortem…
      </div>
    );
  }

  if (!postmortem) {
    return (
      <div style={{ padding: "20px 0", color: "#4e6268", fontSize: 12, fontStyle: "italic" }}>
        No postmortem available for this incident.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {error && (
        <div className="alert-banner" style={{ padding: "10px 14px" }}>
          <div className="alert-content" style={{ fontSize: 12 }}><AlertTriangle size={13} /> {error}</div>
        </div>
      )}

      {/* Summary */}
      {postmortem.summary && (
        <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(140,178,189,0.1)" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.14em", color: "#5a737c", marginBottom: 6 }}>INCIDENT SUMMARY</div>
          <p style={{ margin: 0, fontSize: 12, color: "#a4c2ca", lineHeight: 1.7 }}>{postmortem.summary}</p>
        </div>
      )}

      {/* Impact */}
      {postmortem.impact && (
        <div style={{ padding: "12px 14px", borderRadius: 9, background: "rgba(255,173,79,0.04)", border: "1px solid rgba(255,173,79,0.14)" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.14em", color: "#8a6440", marginBottom: 4 }}>IMPACT</div>
          <div style={{ fontSize: 12, color: "#c4985a", lineHeight: 1.6 }}>{postmortem.impact}</div>
        </div>
      )}

      {/* Root Cause */}
      {postmortem.root_cause && (
        <div style={{ padding: "12px 14px", borderRadius: 9, background: "rgba(255,90,90,0.04)", border: "1px solid rgba(255,90,90,0.14)" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.14em", color: "#8a4a4a", marginBottom: 4 }}>ROOT CAUSE</div>
          <div style={{ fontSize: 12, color: "#d47070", lineHeight: 1.6 }}>{postmortem.root_cause}</div>
        </div>
      )}

      {/* Timeline */}
      {postmortem.timeline && postmortem.timeline.length > 0 && (
        <div>
          <div style={{ fontSize: 9, letterSpacing: "0.14em", color: "#5a737c", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
            <Clock size={10} /> INCIDENT TIMELINE
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0, paddingLeft: 6 }}>
            {postmortem.timeline.map((ev, i) => (
              <div key={i} style={{ display: "flex", gap: 10, paddingBottom: 10, borderLeft: "1px solid rgba(85,221,239,0.15)", paddingLeft: 14, position: "relative" }}>
                <div style={{ position: "absolute", left: -4, top: 5, width: 7, height: 7, borderRadius: "50%", background: "#55ddef", boxShadow: "0 0 8px rgba(85,221,239,0.5)" }} />
                <div>
                  <div style={{ fontSize: 10, color: "#4e8898" }}>{fmt(ev.timestamp)}</div>
                  <div style={{ fontSize: 12, color: "#c4d7dc", fontWeight: 600, marginTop: 1 }}>{ev.event}</div>
                  {ev.description && <div style={{ fontSize: 11, color: "#6e8991", marginTop: 2, lineHeight: 1.5 }}>{ev.description}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lessons */}
      {postmortem.lessons_learned && postmortem.lessons_learned.length > 0 && (
        <div>
          <div style={{ fontSize: 9, letterSpacing: "0.14em", color: "#5a737c", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
            <Sparkles size={10} /> LESSONS LEARNED
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {postmortem.lessons_learned.map((l, i) => (
              <li key={i} style={{ fontSize: 12, color: "#a4c2ca", lineHeight: 1.5, display: "flex", gap: 7, alignItems: "flex-start" }}>
                <CheckCircle2 size={12} style={{ color: "#6ee6a4", marginTop: 2, flexShrink: 0 }} /> {l}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Preventive Actions */}
      {postmortem.preventive_actions && postmortem.preventive_actions.length > 0 && (
        <div>
          <div style={{ fontSize: 9, letterSpacing: "0.14em", color: "#5a737c", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
            <Shield size={10} /> PREVENTIVE ACTIONS
          </div>
          <ol style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: 5 }}>
            {postmortem.preventive_actions.map((a, i) => (
              <li key={i} style={{ fontSize: 12, color: "#a4c2ca", lineHeight: 1.5 }}>{a}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Learning Status + CTA */}
      <div style={{ marginTop: 4, padding: "14px 16px", borderRadius: 10, background: "rgba(85,221,239,0.04)", border: "1px solid rgba(85,221,239,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "#4e8898", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
              <BrainCircuit size={11} /> HINDSIGHT LEARNING STATUS
            </div>
            {status ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { label: "Ready", ok: status.ready },
                  { label: "Has Root Cause", ok: status.has_root_cause },
                  { label: "Successful Actions", ok: status.has_successful_actions },
                  { label: "Failed Actions", ok: status.has_failed_actions },
                  { label: "Lessons", ok: status.has_lessons },
                  { label: "Preventive", ok: status.has_preventive_actions },
                ].map(({ label, ok }) => (
                  <span key={label} style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 3, color: ok ? "#6ee6a4" : "#4e6268" }}>
                    {ok ? <CheckCircle2 size={9} /> : <AlertTriangle size={9} />} {label}
                  </span>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 12, color: "#4e6268" }}>{status === null ? "Status unavailable" : "—"}</span>
            )}
            {status?.reason && <div style={{ fontSize: 11, color: "#5a737c", marginTop: 6 }}>{status.reason}</div>}
          </div>

          <div>
            {learnDone ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6ee6a4" }}>
                <CheckCircle2 size={14} />
                {learnResult?.message || "Learned into Hindsight."}
              </div>
            ) : (
              <button
                onClick={handleLearn}
                disabled={learning || !status?.ready}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "9px 16px", borderRadius: 8, border: 0,
                  background: status?.ready ? "#64deef" : "rgba(100,222,239,0.15)",
                  color: status?.ready ? "#041014" : "#3a7a88",
                  fontWeight: 700, fontSize: 12,
                  cursor: status?.ready && !learning ? "pointer" : "not-allowed",
                }}
              >
                {learning ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <BrainCircuit size={13} />}
                {learning ? "Learning…" : "Learn into Hindsight"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PostmortemsPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  async function fetchIncidents() {
    setLoading(true);
    setError(null);
    try {
      const data = await listIncidents(ORGANIZATION_ID);
      const list = Array.isArray(data) ? data : (data?.items || []);
      setIncidents(list);
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id);
      }
    } catch {
      setError("Failed to load incidents.");
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
        const data = await listIncidents(ORGANIZATION_ID);
        const list = Array.isArray(data) ? data : (data?.items || []);
        if (!ignore) {
          setIncidents(list);
          if (list.length > 0) {
            setSelectedId(prev => prev || list[0].id);
          }
        }
      } catch {
        if (!ignore) setError("Failed to load incidents.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, []);

  const selected = incidents.find(i => i.id === selectedId);

  return (
    <div className="content-wrap" style={{ maxWidth: 1200, padding: "36px 34px 60px" }}>
      {/* Header */}
      <motion.div
        className="hero-row"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 28 }}
      >
        <div>
          <div className="eyebrow">CLOSED LEARNING LOOP</div>
          <h1 style={{ fontFamily: "Audiowide, sans-serif", fontSize: "clamp(24px, 3vw, 38px)", margin: "0 0 10px", color: "#e9f4f7" }}>
            Postmortems
          </h1>
          <p style={{ margin: 0, color: "#6e8991", fontSize: 14, lineHeight: 1.6 }}>
            Review incident postmortems, validate learning readiness, and commit root causes, lessons, and patterns durably into Hindsight memory.
          </p>
        </div>
        <button
          onClick={fetchIncidents}
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

      {/* Error */}
      {error && (
        <div className="alert-banner" style={{ marginBottom: 20 }}>
          <div className="alert-content"><AlertTriangle size={15} /> {error}</div>
          <button className="alert-retry-btn" onClick={fetchIncidents}><RefreshCw size={12} /> Retry</button>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", gap: 14 }}>
          <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "#55ddef" }} />
          <p style={{ color: "#5e747c", fontSize: 13, margin: 0 }}>Loading incidents…</p>
        </div>
      ) : incidents.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#4e6268" }}>
          <BookOpen size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p style={{ margin: 0 }}>No incidents available.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start" }}>
          {/* Incident Selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 9, letterSpacing: "0.14em", color: "#4e6268", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
              <ListChecks size={10} /> SELECT INCIDENT
            </div>
            {incidents.map((inc) => (
              <button
                key={inc.id}
                onClick={() => setSelectedId(inc.id)}
                style={{
                  width: "100%", textAlign: "left", padding: "12px 14px",
                  borderRadius: 10, border: "1px solid",
                  borderColor: selectedId === inc.id ? "rgba(85,221,239,0.35)" : "rgba(140,178,189,0.1)",
                  background: selectedId === inc.id ? "rgba(85,221,239,0.06)" : "rgba(255,255,255,0.015)",
                  cursor: "pointer", transition: "all 0.2s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: selectedId === inc.id ? "#55ddef" : "#5a737c" }}>
                    {inc.incident_key}
                  </span>
                  {inc.severity && (
                    <span style={{ fontSize: 9, color: "#ff8585", padding: "1px 5px", borderRadius: 99, border: "1px solid rgba(255,133,133,0.25)", background: "rgba(255,80,80,0.06)" }}>
                      {inc.severity}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: selectedId === inc.id ? "#c4d7dc" : "#6e8991", lineHeight: 1.3 }}>
                  {inc.title}
                </div>
                <div style={{ fontSize: 10, color: "#3e5258", marginTop: 4 }}>
                  {resolveService(inc.service_id)}
                </div>
              </button>
            ))}
          </div>

          {/* Postmortem Detail */}
          <div className="panel" style={{ borderRadius: 12, padding: "22px 24px" }}>
            {selected ? (
              <>
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#4e8898", marginBottom: 5 }}>
                    POSTMORTEM · {selected.incident_key}
                  </div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#e9f4f7" }}>{selected.title}</h2>
                </div>
                <PostmortemDetail incidentId={selected.id} incident={selected} />
              </>
            ) : (
              <div style={{ color: "#4e6268", fontSize: 13 }}>Select an incident to view its postmortem.</div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
