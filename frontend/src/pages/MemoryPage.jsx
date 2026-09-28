import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit,
  Search,
  Loader2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
  BookOpen,
  FlaskConical,
  Database,
  Calendar,
  Layers,
  Server,
  ShieldAlert,
} from "lucide-react";
import { recallMemories, reflectMemories } from "../api/memories";
import { ORGANIZATION_ID } from "../api/client";

const DEFAULT_QUERY = "Payments API elevated 5xx errors database connection pool pressure";

const TYPE_CONFIG = {
  successful_action: {
    bg: "rgba(110,230,164,0.06)",
    border: "rgba(110,230,164,0.22)",
    badge: "#6ee6a4",
    label: "SUCCESSFUL ACTION",
    icon: CheckCircle2,
  },
  failed_action: {
    bg: "rgba(255,133,133,0.07)",
    border: "rgba(255,133,133,0.28)",
    badge: "#ff8585",
    label: "FAILED ACTION",
    icon: XCircle,
    isFailure: true,
  },
  root_cause: {
    bg: "rgba(255,173,79,0.06)",
    border: "rgba(255,173,79,0.24)",
    badge: "#ffa94d",
    label: "ROOT CAUSE",
    icon: AlertTriangle,
  },
  incident_experience: {
    bg: "rgba(85,221,239,0.06)",
    border: "rgba(85,221,239,0.20)",
    badge: "#55ddef",
    label: "INCIDENT EXPERIENCE",
    icon: Layers,
  },
  lesson: {
    bg: "rgba(176,132,255,0.06)",
    border: "rgba(176,132,255,0.22)",
    badge: "#c09aff",
    label: "LESSON LEARNED",
    icon: Sparkles,
  },
  verification: {
    bg: "rgba(85,238,221,0.06)",
    border: "rgba(85,238,221,0.20)",
    badge: "#55eedd",
    label: "VERIFICATION",
    icon: CheckCircle2,
  },
};

function MemoryCard({ item, index }) {
  const mt = (item.memory_type || "incident_experience").toLowerCase();
  const config = TYPE_CONFIG[mt] || {
    bg: "rgba(85,221,239,0.06)",
    border: "rgba(85,221,239,0.18)",
    badge: "#55ddef",
    label: (item.memory_type || "MEMORY").toUpperCase(),
    icon: BrainCircuit,
  };
  const Icon = config.icon;

  const incidentKey = item.incident_key || item.incident_id || null;
  const service = item.service || item.service_id || null;
  const occurredAt = item.occurred_at || null;
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const relevance = item.relevance !== undefined && item.relevance !== null
    ? item.relevance
    : item.score !== undefined && item.score !== null
    ? item.score
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      style={{
        position: "relative",
        padding: "18px 20px",
        borderRadius: 12,
        border: `1px solid ${config.border}`,
        background: config.bg,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Top-edge accent line */}
      <div
        style={{
          position: "absolute",
          top: -1,
          left: 0,
          height: 2,
          width: "35%",
          background: config.badge,
          borderRadius: "999px 999px 0 0",
          opacity: 0.8,
        }}
      />

      {/* Header: Type Badge, Do Not Repeat warning (if failed), and Relevance */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.12em",
              padding: "3px 8px",
              borderRadius: 99,
              border: `1px solid ${config.border}`,
              color: config.badge,
              background: "rgba(0,0,0,0.25)",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Icon size={10} />
            {config.label}
          </span>

          {config.isFailure && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.10em",
                padding: "3px 7px",
                borderRadius: 99,
                border: "1px solid rgba(255,133,133,0.4)",
                color: "#ff8585",
                background: "rgba(255,80,80,0.12)",
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <ShieldAlert size={10} />
              DO NOT REPEAT
            </span>
          )}
        </div>

        {relevance !== null && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#55ddef",
              padding: "2px 6px",
              borderRadius: 4,
              background: "rgba(85,221,239,0.08)",
              border: "1px solid rgba(85,221,239,0.15)",
            }}
          >
            {(relevance * 100).toFixed(0)}% relevance
          </span>
        )}
      </div>

      {/* Main Memory Content */}
      <p style={{ margin: 0, fontSize: 13, color: "#d6e5ea", lineHeight: 1.65 }}>
        {item.content}
      </p>

      {/* Telemetry Row: Incident, Service, Date */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 11, color: "#6e8991" }}>
        {incidentKey && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 7px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(140,178,189,0.12)",
              color: "#9fb9c2",
              fontFamily: "monospace",
              fontSize: 11,
            }}
          >
            <Database size={10} style={{ color: "#55ddef" }} />
            {incidentKey}
          </span>
        )}

        {service && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 7px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(140,178,189,0.12)",
              color: "#8aa5ad",
            }}
          >
            <Server size={10} />
            {service}
          </span>
        )}

        {occurredAt && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 7px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(140,178,189,0.08)",
              color: "#5e747c",
            }}
          >
            <Calendar size={10} />
            {occurredAt}
          </span>
        )}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 2 }}>
          {tags.map((tag, i) => (
            <span
              key={i}
              style={{
                fontSize: 9,
                color: "#4e656d",
                padding: "1px 6px",
                borderRadius: 4,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(140,178,189,0.08)",
                fontFamily: "monospace",
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function ReflectionPanel({ reflection }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {reflection.conclusion && (
        <div className="panel" style={{ borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#5a737c", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <Sparkles size={13} style={{ color: "#55ddef" }} /> HINDSIGHT / OLLAMA SYNTHESIS
          </div>
          <div style={{ whiteSpace: "pre-wrap", color: "#c4d7dc", fontSize: 13, lineHeight: 1.7 }}>
            {reflection.conclusion}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {reflection.successful_patterns && reflection.successful_patterns.length > 0 && (
          <div className="panel" style={{ borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#4a7060", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
              <CheckCircle2 size={11} style={{ color: "#6ee6a4" }} /> WHAT WORKED HISTORICALLY
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
              {reflection.successful_patterns.map((p, i) => (
                <li key={i} style={{ fontSize: 12, color: "#6ee6a4", lineHeight: 1.5, display: "flex", gap: 6 }}>
                  <span>✓</span> {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {reflection.failed_patterns && reflection.failed_patterns.length > 0 && (
          <div className="panel" style={{ borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#7a4a4a", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
              <XCircle size={11} style={{ color: "#ff8585" }} /> WHAT FAILED / DO NOT REPEAT
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
              {reflection.failed_patterns.map((p, i) => (
                <li key={i} style={{ fontSize: 12, color: "#ff8585", lineHeight: 1.5, display: "flex", gap: 6 }}>
                  <span>✕</span> {p}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {reflection.warnings && reflection.warnings.length > 0 && (
        <div className="panel" style={{ borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#7a6040", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
            <AlertTriangle size={11} style={{ color: "#ffa94d" }} /> WHAT SHOULD NOT BE REPEATED
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {reflection.warnings.map((w, i) => (
              <li key={i} style={{ fontSize: 12, color: "#ffa94d", lineHeight: 1.5 }}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {reflection.supporting_memories && reflection.supporting_memories.length > 0 && (
        <div className="panel" style={{ borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#5a737c", marginBottom: 8 }}>SUPPORTING MEMORIES</div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {reflection.supporting_memories.map((m, i) => (
              <li key={i} style={{ fontSize: 12, color: "#8aa5ad", lineHeight: 1.5, display: "flex", gap: 7, alignItems: "flex-start" }}>
                <span style={{ color: "#55ddef", marginTop: 2, flexShrink: 0 }}>·</span> {m}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function MemoryPage() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [mode, setMode] = useState("recall"); // "recall" | "reflect"

  const [recallResult, setRecallResult] = useState(null);
  const [reflectResult, setReflectResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const executeQuery = async (targetQuery, targetMode) => {
    if (!targetQuery.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      if (targetMode === "recall") {
        const result = await recallMemories(ORGANIZATION_ID, targetQuery.trim());
        setRecallResult(result);
        setReflectResult(null);
      } else {
        const result = await reflectMemories(ORGANIZATION_ID, targetQuery.trim());
        setReflectResult(result);
        setRecallResult(null);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || "Memory query failed. Try a different query.");
    } finally {
      setLoading(false);
    }
  };

  // On page load: automatically execute default memory query
  useEffect(() => {
    let ignore = false;
    async function loadInitial() {
      setLoading(true);
      setError(null);
      setSearched(true);
      try {
        const result = await recallMemories(ORGANIZATION_ID, DEFAULT_QUERY);
        if (!ignore) {
          setRecallResult(result);
        }
      } catch {
        if (!ignore) {
          setError("Failed to load initial historical memory.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadInitial();
    return () => {
      ignore = true;
    };
  }, []);

  const handleSearch = (e) => {
    e?.preventDefault();
    executeQuery(query, mode);
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    executeQuery(query, newMode);
  };

  const handleClear = () => {
    setQuery("");
    setRecallResult(null);
    setReflectResult(null);
    setSearched(false);
    setError(null);
  };

  const items = recallResult?.items || [];
  const total = recallResult?.total ?? items.length;
  const isDemoFallback = recallResult?.demo_memory || recallResult?.provider === "demo_memory" || reflectResult?.demo_memory;

  return (
    <div className="content-wrap" style={{ maxWidth: 1100, padding: "36px 34px 60px" }}>
      {/* Header */}
      <motion.div
        className="hero-row"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 26 }}
      >
        <div>
          <div className="eyebrow">HINDSIGHT MEMORY ENGINE</div>
          <h1 style={{ fontFamily: "Audiowide, sans-serif", fontSize: "clamp(24px, 3vw, 38px)", margin: "0 0 10px", color: "#e9f4f7" }}>
            Memory Intelligence
          </h1>
          <p style={{ margin: 0, color: "#6e8991", fontSize: 14, lineHeight: 1.6 }}>
            Query Hindsight's incident memory store. Recall matching past experiences or synthesize patterns, root causes, and failed actions across engineering history.
          </p>
        </div>

        {/* Provider / Fallback Status Badge */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          {isDemoFallback ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid rgba(85,221,239,0.30)",
                background: "rgba(85,221,239,0.06)",
                color: "#55ddef",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.08em",
              }}
            >
              <Database size={13} />
              LOCAL MEMORY FALLBACK
              <span style={{ color: "#799fa9", fontWeight: 400, fontSize: 10 }}>· Demo historical store</span>
            </div>
          ) : (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid rgba(110,230,164,0.30)",
                background: "rgba(110,230,164,0.06)",
                color: "#6ee6a4",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.08em",
              }}
            >
              <BrainCircuit size={13} />
              HINDSIGHT CONNECTED
            </div>
          )}
        </div>
      </motion.div>

      {/* Mode Toggle */}
      <div style={{ display: "flex", gap: 4, padding: "4px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(140,178,189,0.1)", marginBottom: 20, width: "fit-content" }}>
        {[
          { key: "recall", label: "Recall Memories", icon: BookOpen },
          { key: "reflect", label: "Reflect & Synthesize", icon: FlaskConical },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleModeChange(key)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
              borderRadius: 8, border: 0, fontSize: 12, fontWeight: 600, cursor: "pointer",
              transition: "all 0.2s ease",
              background: mode === key ? "rgba(85,221,239,0.12)" : "transparent",
              color: mode === key ? "#6de8f7" : "#5a737c",
            }}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <motion.form
        onSubmit={handleSearch}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ display: "flex", gap: 10, marginBottom: 24 }}
      >
        <div className="search-input-wrap" style={{ flex: 1 }}>
          <Search size={15} className="search-icon" />
          <input
            className="search-input"
            type="text"
            placeholder={
              mode === "recall"
                ? "e.g. database connection pool exhaustion, payment timeouts…"
                : "e.g. What causes repeated Payments API failures?"
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button type="button" className="search-clear-btn" onClick={handleClear}>
              <X size={14} />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "0 22px", borderRadius: 9, border: 0,
            background: query.trim() ? "#64deef" : "rgba(100,222,239,0.3)",
            color: query.trim() ? "#041014" : "#3a7a88",
            fontWeight: 700, fontSize: 13, cursor: query.trim() ? "pointer" : "not-allowed",
            transition: "all 0.2s ease",
          }}
        >
          {loading ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <BrainCircuit size={15} />}
          {mode === "recall" ? "Recall" : "Reflect"}
        </button>
      </motion.form>

      {/* Error */}
      {error && (
        <div className="alert-banner" style={{ marginBottom: 20 }}>
          <div className="alert-content"><AlertTriangle size={15} /> {error}</div>
          <button className="alert-retry-btn" onClick={handleSearch}><RefreshCw size={12} /> Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", gap: 14 }}>
          <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "#55ddef" }} />
          <p style={{ color: "#5e747c", fontSize: 13, margin: 0 }}>
            {mode === "recall" ? "Querying engineering memory store…" : "Synthesizing patterns from engineering history…"}
          </p>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {!loading && searched && mode === "recall" && (
          <motion.div key="recall-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {items.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#4e6268" }}>
                <BrainCircuit size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: 14 }}>No memories found for this query.</p>
                <p style={{ margin: "6px 0 0", fontSize: 12 }}>Try broader terms or record more incident actions.</p>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "#5a737c", letterSpacing: "0.12em" }}>
                    RECALLED {total} HISTORICAL RECORD{total === 1 ? "" : "S"}
                  </div>
                  <div style={{ fontSize: 11, color: "#4e656d" }}>
                    Query: <em style={{ color: "#8aa5ad" }}>{recallResult?.query}</em>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
                  {items.map((item, i) => (
                    <MemoryCard key={item.memory_id || item.id || i} item={item} index={i} />
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}

        {!loading && searched && mode === "reflect" && reflectResult && (
          <motion.div key="reflect-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ fontSize: 11, color: "#5a737c", letterSpacing: "0.12em", marginBottom: 16 }}>
              SYNTHESIS · Query: <em style={{ color: "#8aa5ad" }}>{query}</em>
            </div>
            <ReflectionPanel reflection={reflectResult} />
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
