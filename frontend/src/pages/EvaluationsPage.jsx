import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Gauge,
  Loader2,
  AlertTriangle,
  RefreshCw,
  BrainCircuit,
  TrendingUp,
  Shield,
  CheckCircle2,
  GitCompareArrows,
  BarChart3,
  Database,
  History,
  ChevronDown,
  Sparkles,
  Layers,
} from "lucide-react";
import {
  listEvaluations,
  getEvaluationSummary,
} from "../api/evaluations";

function formatDate(timestamp) {
  if (!timestamp) return "—";
  try {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return timestamp;
  }
}

function cleanText(value) {
  return String(value || "")
    .replace(/^#+\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();
}

function getMemoryProvider(result) {
  const metadata = result?.reasoning_metadata || {};
  if (
    metadata.memory_provider === "demo_memory" ||
    metadata.memory_provider === "hindsight" ||
    metadata.memory_provider === "mixed"
  ) {
    return metadata.memory_provider;
  }

  const historical = Array.isArray(metadata.historical_experience)
    ? metadata.historical_experience
    : [];

  const providers = new Set(
    historical
      .map((item) => String(item?.provider || "").trim().toLowerCase())
      .filter(Boolean)
  );

  if (providers.has("demo_memory")) {
    return providers.has("hindsight") ? "mixed" : "demo_memory";
  }
  if (providers.has("hindsight")) {
    return "hindsight";
  }
  if (historical.length > 0) {
    return "demo_memory";
  }

  return "none";
}

function providerLabel(provider) {
  switch (provider) {
    case "hindsight":
      return "SOURCE: HINDSIGHT";
    case "demo_memory":
      return "SOURCE: LOCAL DEMO MEMORY";
    case "mixed":
      return "SOURCE: MIXED MEMORY";
    case "recorded_historical_memory":
      return "SOURCE: RECORDED HISTORICAL MEMORY";
    default:
      return "SOURCE: NONE";
  }
}

function providerTone(provider) {
  switch (provider) {
    case "hindsight":
      return "live";
    case "demo_memory":
      return "demo";
    case "mixed":
      return "mixed";
    default:
      return "neutral";
  }
}

function rootCauseText(result, evaluationMode) {
  const metadata = result?.reasoning_metadata || {};
  const source = metadata.root_cause_source;

  if (result?.root_cause && source === "incident_record") {
    return {
      value: cleanText(result.root_cause),
      confirmed: true,
    };
  }

  if (evaluationMode === "baseline") {
    return {
      value: "Not evaluated from historical memory.",
      confirmed: false,
    };
  }

  return {
    value: "Not confirmed in current incident record.",
    confirmed: false,
  };
}

function compactHistoricalRecords(result) {
  const metadata = result?.reasoning_metadata || {};
  const memories = Array.isArray(metadata.historical_experience)
    ? metadata.historical_experience
    : [];

  return memories
    .map((memory) => ({
      id: memory?.id || memory?.memory_id || null,
      incidentKey:
        memory?.incident_key ||
        memory?.source_incident_key ||
        "Historical incident",
      type: memory?.memory_type || memory?.type || "historical",
      service: memory?.service || memory?.service_id || "—",
      occurredAt: memory?.occurred_at || memory?.timestamp || null,
      score: memory?.score ?? memory?.relevance ?? null,
      content: memory?.text || memory?.content || "",
    }))
    .filter((memory) => memory.content.trim());
}

function ModeBadge({ mode }) {
  const comparison = mode === "comparison";
  const memoryAssisted = mode === "hindsight" || comparison;

  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.12em",
        padding: "3px 8px",
        borderRadius: 999,
        border: memoryAssisted
          ? "1px solid rgba(85,221,239,0.3)"
          : "1px solid rgba(140,178,189,0.2)",
        color: memoryAssisted ? "#55ddef" : "#8aa5ad",
        background: memoryAssisted
          ? "rgba(85,221,239,0.06)"
          : "rgba(140,178,189,0.04)",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      {comparison ? (
        <GitCompareArrows size={10} />
      ) : memoryAssisted ? (
        <BrainCircuit size={10} />
      ) : (
        <BarChart3 size={10} />
      )}
      {comparison
        ? "COMPARISON"
        : memoryAssisted
        ? "MEMORY-ASSISTED"
        : "BASELINE"}
    </span>
  );
}

function SourceBadge({ provider }) {
  const label = providerLabel(provider);
  const tone = providerTone(provider);

  const styles = {
    live: {
      border: "1px solid rgba(110,230,164,0.25)",
      color: "#6ee6a4",
      background: "rgba(110,230,164,0.05)",
    },
    demo: {
      border: "1px solid rgba(85,221,239,0.25)",
      color: "#55ddef",
      background: "rgba(85,221,239,0.05)",
    },
    mixed: {
      border: "1px solid rgba(203,170,255,0.25)",
      color: "#cbaaff",
      background: "rgba(203,170,255,0.05)",
    },
    neutral: {
      border: "1px solid rgba(140,178,189,0.16)",
      color: "#8aa5ad",
      background: "rgba(140,178,189,0.03)",
    },
  };

  const active = styles[tone] || styles.neutral;

  return (
    <span
      style={{
        ...active,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.10em",
        padding: "3px 8px",
        borderRadius: 999,
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      <Database size={10} />
      {label}
    </span>
  );
}

function StructuredSection({
  label,
  values,
  tone = "neutral",
  icon: Icon,
  emptyText = "None recorded.",
}) {
  const items = Array.isArray(values) ? values.filter(Boolean) : [];
  const textColors = {
    success: "#6ee6a4",
    failure: "#ff8585",
    warning: "#ffa94d",
    purple: "#c09aff",
    neutral: "#8aa5ad",
  };
  const color = textColors[tone] || textColors.neutral;

  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.12em",
          color: "#5a737c",
          marginBottom: 6,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        {Icon && <Icon size={11} style={{ color }} />}
        {label}
      </div>

      {items.length === 0 ? (
        <div style={{ color: "#40565e", fontSize: 11, lineHeight: 1.5 }}>
          {emptyText}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.slice(0, 6).map((value, index) => (
            <div
              key={`${label}-${index}`}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 6,
                color,
                fontSize: 11,
                lineHeight: 1.55,
              }}
            >
              <span style={{ opacity: 0.6, flexShrink: 0 }}>•</span>
              <span>{cleanText(value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoricalEvidence({ records }) {
  if (!records || !records.length) return null;

  return (
    <details
      style={{
        marginTop: 16,
        borderTop: "1px solid rgba(140,178,189,0.08)",
        paddingTop: 12,
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          listStyle: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          color: "#78939b",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <History size={11} />
          HISTORICAL EVIDENCE ({records.length})
        </span>
        <ChevronDown size={12} />
      </summary>

      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
        {records.slice(0, 6).map((memory, index) => (
          <div
            key={memory.id || `${memory.incidentKey}-${index}`}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid rgba(85,221,239,0.08)",
              background: "rgba(85,221,239,0.02)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 6,
                marginBottom: 5,
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#55ddef",
                  fontFamily: "monospace",
                }}
              >
                {memory.incidentKey}
              </span>
              <span
                style={{
                  fontSize: 8,
                  padding: "1px 5px",
                  borderRadius: 4,
                  border: "1px solid rgba(140,178,189,0.12)",
                  color: "#78939b",
                }}
              >
                {memory.type}
              </span>
              {memory.score != null && (
                <span style={{ fontSize: 8, color: "#5f7c84" }}>
                  relevance {(Number(memory.score) * 100).toFixed(0)}%
                </span>
              )}
              {memory.occurredAt && (
                <span style={{ fontSize: 8, color: "#4f666e" }}>
                  {formatDate(memory.occurredAt)}
                </span>
              )}
            </div>

            <div style={{ fontSize: 10, color: "#86a2aa", lineHeight: 1.55 }}>
              {cleanText(memory.content)}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

function EvalCard({ evaluation, index }) {
  const result = evaluation?.result || {};
  const provider = getMemoryProvider(result);
  const rootCause = rootCauseText(result, evaluation?.mode);
  const comparison = evaluation?.mode === "comparison";
  const memoryAssisted = evaluation?.mode === "hindsight" || comparison;

  const metadata = result?.reasoning_metadata || {};
  const reasoningChanges = Array.isArray(metadata.reasoning_changes)
    ? metadata.reasoning_changes
    : [];
  const avoided = Array.isArray(metadata.avoided_failed_actions)
    ? metadata.avoided_failed_actions
    : [];
  const preventiveInsights = Array.isArray(metadata.preventive_insights)
    ? metadata.preventive_insights
    : [];

  const worked = result?.successful_historical_patterns || [];
  const failed = result?.failed_historical_patterns || [];
  const warnings = result?.warnings || [];
  const recommendations = result?.recommended_actions || [];
  const records = compactHistoricalRecords(result);

  return (
    <motion.article
      className="panel"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{
        borderRadius: 12,
        padding: "20px 22px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
            }}
          >
            <ModeBadge mode={evaluation.mode} />
            {memoryAssisted && <SourceBadge provider={provider} />}
          </div>

          <div style={{ fontSize: 11, color: "#4e6268", marginBottom: 2 }}>
            Incident:{" "}
            <code style={{ color: "#6e8991", fontSize: 11 }}>
              {(evaluation.incident_id || "").slice(0, 12)}…
            </code>
          </div>

          <div style={{ fontSize: 10, color: "#3a4e54" }}>
            {formatDate(evaluation.created_at || evaluation.evaluated_at)}
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: memoryAssisted ? "#55ddef" : "#8aa5ad",
              lineHeight: 1,
            }}
          >
            {result.memories_used ?? 0}
          </div>
          <div
            style={{
              fontSize: 8,
              color: "#4e6268",
              letterSpacing: "0.12em",
              marginTop: 3,
            }}
          >
            MEMORIES USED
          </div>
        </div>
      </div>

      {/* Fallback Notice */}
      {memoryAssisted && provider === "demo_memory" && (
        <div
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid rgba(85,221,239,0.14)",
            background: "rgba(85,221,239,0.025)",
            color: "#6f929b",
            fontSize: 10,
            lineHeight: 1.45,
          }}
        >
          <strong style={{ color: "#55ddef" }}>LOCAL MEMORY FALLBACK:</strong>{" "}
          Hindsight unavailable — using recorded local historical memory for
          demo continuity.
        </div>
      )}

      {/* Root Cause Card */}
      <div
        style={{
          padding: "10px 12px",
          borderRadius: 8,
          background: rootCause.confirmed
            ? "rgba(255,173,79,0.04)"
            : "rgba(140,178,189,0.025)",
          border: rootCause.confirmed
            ? "1px solid rgba(255,173,79,0.16)"
            : "1px solid rgba(140,178,189,0.08)",
        }}
      >
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: rootCause.confirmed ? "#ffa94d" : "#536d75",
            marginBottom: 4,
          }}
        >
          CURRENT ROOT CAUSE
        </div>

        <div
          style={{
            fontSize: 11,
            color: rootCause.confirmed ? "#e0b27e" : "#78939b",
            lineHeight: 1.55,
          }}
        >
          {rootCause.value}
        </div>

        <div
          style={{
            marginTop: 4,
            fontSize: 8,
            color: "#40565e",
            letterSpacing: "0.08em",
          }}
        >
          {rootCause.confirmed
            ? "CONFIRMED FROM CURRENT INCIDENT RECORD"
            : "STATUS: NOT CONFIRMED"}
        </div>
      </div>

      {/* Structured Sections */}
      {worked.length > 0 && (
        <StructuredSection
          label="WHAT WORKED BEFORE"
          values={worked}
          tone="success"
          icon={CheckCircle2}
        />
      )}

      {failed.length > 0 && (
        <StructuredSection
          label="WHAT FAILED BEFORE"
          values={failed}
          tone="failure"
          icon={Shield}
        />
      )}

      {warnings.length > 0 && (
        <StructuredSection
          label="WHAT SHOULD NOT BE REPEATED"
          values={warnings}
          tone="warning"
          icon={AlertTriangle}
        />
      )}

      {preventiveInsights.length > 0 && (
        <StructuredSection
          label="PREVENTIVE LESSONS"
          values={preventiveInsights}
          tone="purple"
          icon={Sparkles}
        />
      )}

      {recommendations.length > 0 && (
        <StructuredSection
          label="INVESTIGATION RECOMMENDATIONS"
          values={recommendations}
          tone="neutral"
          icon={Layers}
        />
      )}

      <HistoricalEvidence records={records} />

      {/* Comparison Details */}
      {comparison && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px solid rgba(140,178,189,0.08)",
          }}
        >
          {reasoningChanges.length > 0 && (
            <StructuredSection
              label="REASONING CHANGES"
              values={reasoningChanges}
              tone="neutral"
            />
          )}

          {avoided.length > 0 && (
            <StructuredSection
              label="HISTORICAL FAILURES SURFACED"
              values={avoided}
              tone="failure"
            />
          )}
        </div>
      )}

      {/* Collapsible Full Reasoning */}
      {result.answer && (
        <details
          style={{
            marginTop: 10,
            borderTop: "1px solid rgba(140,178,189,0.06)",
            paddingTop: 10,
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              listStyle: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "#5f7c84",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.12em",
            }}
          >
            <ChevronDown size={11} />
            FULL REASONING
          </summary>

          <div
            style={{
              marginTop: 8,
              padding: "10px 12px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(140,178,189,0.07)",
              color: "#78939b",
              fontSize: 10,
              lineHeight: 1.65,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              maxHeight: 280,
              overflowY: "auto",
            }}
          >
            {result.answer}
          </div>
        </details>
      )}
    </motion.article>
  );
}

export function EvaluationsPage() {
  const [summary, setSummary] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [sumData, evalsData] = await Promise.all([
        getEvaluationSummary(),
        listEvaluations(),
      ]);
      setSummary(sumData);
      setEvaluations(Array.isArray(evalsData) ? evalsData : []);
    } catch {
      setError("Failed to load evaluation data.");
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
        const [sumData, evalsData] = await Promise.all([
          getEvaluationSummary(),
          listEvaluations(),
        ]);
        if (!ignore) {
          setSummary(sumData);
          setEvaluations(Array.isArray(evalsData) ? evalsData : []);
        }
      } catch {
        if (!ignore) {
          setError("Failed to load evaluation data.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const baselineEvals = evaluations.filter(
    (evaluation) => evaluation.mode === "baseline"
  );
  const memoryAssistedEvals = evaluations.filter(
    (evaluation) =>
      evaluation.mode === "hindsight" || evaluation.mode === "comparison"
  );
  const otherEvals = evaluations.filter(
    (evaluation) =>
      evaluation.mode !== "baseline" &&
      evaluation.mode !== "hindsight" &&
      evaluation.mode !== "comparison"
  );

  return (
    <div
      className="content-wrap"
      style={{ maxWidth: 1380, padding: "36px 34px 60px" }}
    >
      {/* Header */}
      <motion.div
        className="hero-row"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 28 }}
      >
        <div>
          <div className="eyebrow">AGENT BENCHMARKS</div>
          <h1
            style={{
              fontFamily: "Audiowide, sans-serif",
              fontSize: "clamp(24px, 3vw, 38px)",
              margin: "0 0 10px",
              color: "#e9f4f7",
            }}
          >
            Evaluations
          </h1>
          <p
            style={{
              margin: 0,
              color: "#6e8991",
              fontSize: 14,
              lineHeight: 1.6,
              maxWidth: 800,
            }}
          >
            Compare current-evidence reasoning with memory-assisted incident
            investigation using recorded historical engineering experience.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "10px 16px",
            borderRadius: 9,
            border: "1px solid rgba(140,178,189,0.15)",
            background: "rgba(255,255,255,0.03)",
            color: "#8aa5ad",
            fontSize: 12,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? (
            <Loader2
              size={14}
              style={{ animation: "spin 1s linear infinite" }}
            />
          ) : (
            <RefreshCw size={14} />
          )}
          Refresh
        </button>
      </motion.div>

      {/* Error banner */}
      {error && (
        <div className="alert-banner" style={{ marginBottom: 20 }}>
          <div className="alert-content">
            <AlertTriangle size={15} />
            {error}
          </div>
          <button className="alert-retry-btn" onClick={fetchData}>
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "80px 0",
            gap: 14,
          }}
        >
          <Loader2
            size={28}
            style={{ animation: "spin 1s linear infinite", color: "#55ddef" }}
          />
          <p style={{ color: "#5e747c", fontSize: 13, margin: 0 }}>
            Loading evaluations…
          </p>
        </div>
      ) : (
        <>
          {/* KPI Summary Grid */}
          {summary && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
                marginBottom: 28,
              }}
            >
              {[
                {
                  label: "TOTAL EVALUATIONS",
                  value: summary.total_evaluations ?? "—",
                  icon: Gauge,
                  color: "#55ddef",
                },
                {
                  label: "BASELINE EVALS",
                  value: summary.baseline_evaluations ?? "—",
                  icon: BarChart3,
                  color: "#8aa5ad",
                },
                {
                  label: "MEMORY-ASSISTED EVALS",
                  value: summary.hindsight_evaluations ?? "—",
                  icon: BrainCircuit,
                  color: "#55ddef",
                },
                {
                  label: "AVG MEMORIES USED",
                  value:
                    summary.average_memories_used != null
                      ? Number(summary.average_memories_used).toFixed(1)
                      : "—",
                  icon: TrendingUp,
                  color: "#6ee6a4",
                },
                {
                  label: "IMPROVED REASONING",
                  value: summary.incidents_with_improved_reasoning ?? "—",
                  icon: CheckCircle2,
                  color: "#6ee6a4",
                },
                {
                  label: "FAILED PATTERNS SURFACED",
                  value: summary.incidents_with_avoided_failed_actions ?? "—",
                  icon: Shield,
                  color: "#ffb067",
                },
              ].map(({ label, value, icon: Icon, color }) => (
                <div
                  key={label}
                  className="metric-card"
                  style={{
                    borderRadius: 11,
                    padding: "16px 18px",
                    minHeight: "auto",
                    gap: 10,
                  }}
                >
                  <div
                    className="metric-icon"
                    style={{ width: 32, height: 32, color }}
                  >
                    <Icon size={15} />
                  </div>
                  <div className="metric-main">
                    <div className="metric-label">{label}</div>
                    <div
                      className="metric-value"
                      style={{ fontSize: 24, color }}
                    >
                      {value}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Comparison View */}
          {evaluations.length > 0 ? (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 18,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  color: "#4e6268",
                }}
              >
                <GitCompareArrows size={13} />
                CURRENT EVIDENCE vs MEMORY-ASSISTED REASONING
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
                  gap: 20,
                  alignItems: "start",
                }}
              >
                {/* Column 1: Baseline */}
                <section>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 14,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      color: "#6e8991",
                    }}
                  >
                    <BarChart3 size={12} />
                    BASELINE ({baselineEvals.length})
                  </div>

                  {baselineEvals.length === 0 ? (
                    <div
                      style={{
                        padding: "40px 20px",
                        textAlign: "center",
                        borderRadius: 12,
                        border: "1px dashed rgba(140,178,189,0.12)",
                        color: "#3a4e54",
                        fontSize: 12,
                      }}
                    >
                      No baseline evaluations recorded.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      {baselineEvals.map((evaluation, index) => (
                        <EvalCard
                          key={evaluation.id || index}
                          evaluation={evaluation}
                          index={index}
                        />
                      ))}
                    </div>
                  )}
                </section>

                {/* Column 2: Memory-Assisted */}
                <section>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 14,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      color: "#55ddef",
                    }}
                  >
                    <BrainCircuit size={12} />
                    MEMORY-ASSISTED ({memoryAssistedEvals.length})
                  </div>

                  {memoryAssistedEvals.length === 0 ? (
                    <div
                      style={{
                        padding: "40px 20px",
                        textAlign: "center",
                        borderRadius: 12,
                        border: "1px dashed rgba(85,221,239,0.12)",
                        color: "#3a4e54",
                        fontSize: 12,
                      }}
                    >
                      No memory-assisted evaluations recorded.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      {memoryAssistedEvals.map((evaluation, index) => (
                        <EvalCard
                          key={evaluation.id || index}
                          evaluation={evaluation}
                          index={index}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {otherEvals.length > 0 && (
                <section style={{ marginTop: 22 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 12,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      color: "#4e6268",
                    }}
                  >
                    <Database size={12} />
                    OTHER EVALUATIONS
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(340px, 1fr))",
                      gap: 12,
                    }}
                  >
                    {otherEvals.map((evaluation, index) => (
                      <EvalCard
                        key={evaluation.id || index}
                        evaluation={evaluation}
                        index={index}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "80px 0",
                color: "#4e6268",
              }}
            >
              <Gauge size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p style={{ margin: 0 }}>No evaluations recorded yet.</p>
              <p style={{ margin: "8px 0 0", fontSize: 12 }}>
                Run investigations from the Command Center to generate
                evaluation data.
              </p>
            </div>
          )}
        </>
      )}

      <style>{`
        details > summary::-webkit-details-marker {
          display: none;
        }
      `}</style>
    </div>
  );
}