import { AnimatePresence, motion } from "framer-motion";
import {
  BrainCircuit,
  ChevronDown,
  Cpu,
  Database,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

function ConfidenceBar({ value }) {
  const numericValue =
    typeof value === "number"
      ? Math.max(0, Math.min(1, value))
      : null;

  if (numericValue === null) {
    return (
      <div className="reasoning-confidence reasoning-confidence--unknown">
        <div className="reasoning-confidence__top">
          <span>CONFIDENCE</span>
          <strong>—</strong>
        </div>

        <div className="reasoning-confidence__track">
          <span style={{ width: "0%" }} />
        </div>

        <p>Confidence is unavailable for this result.</p>
      </div>
    );
  }

  return (
    <div className="reasoning-confidence">
      <div className="reasoning-confidence__top">
        <span>CONFIDENCE</span>
        <strong>{Math.round(numericValue * 100)}%</strong>
      </div>

      <div className="reasoning-confidence__track">
        <motion.span
          initial={{ width: 0 }}
          animate={{ width: `${numericValue * 100}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>

      <p>
        Heuristic agent confidence, not a calibrated probability.
      </p>
    </div>
  );
}

function Signal({ icon: Icon, label, value, tone = "default" }) {
  return (
    <motion.div
      className={`reasoning-signal reasoning-signal--${tone}`}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18 }}
    >
      <div className="reasoning-signal__icon">
        <Icon size={16} strokeWidth={1.8} />
      </div>

      <div className="reasoning-signal__content">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </motion.div>
  );
}

export function ReasoningPanel({
  investigation,
  loading = false,
  error = null,
}) {
  const [expanded, setExpanded] = useState(false);

  const provider =
    investigation?.provider ||
    investigation?.reasoning?.provider ||
    "ollama";

  const memoryCount =
    typeof investigation?.memory_count === "number"
      ? investigation.memory_count
      : typeof investigation?.historical_experience?.memory_count ===
          "number"
        ? investigation.historical_experience.memory_count
        : 0;

  const confidence =
    typeof investigation?.confidence === "number"
      ? investigation.confidence
      : null;

  const summary =
    investigation?.summary ||
    investigation?.reasoning?.summary ||
    "";

  const reasoning =
    investigation?.reasoning?.details ||
    investigation?.reasoning?.text ||
    investigation?.reasoning ||
    "";

  const reasoningText =
    typeof reasoning === "string"
      ? reasoning
      : JSON.stringify(reasoning, null, 2);

  const normalizedProvider = String(provider).toLowerCase();

  const isOllama =
    normalizedProvider.includes("ollama") ||
    normalizedProvider.includes("local");

  const hindsightAvailable =
    investigation?.hindsight_available ??
    investigation?.historical_experience?.available ??
    memoryCount > 0;

  const statusLabel = loading
    ? "ANALYSIS RUNNING"
    : error
      ? "LOCAL AGENT UNAVAILABLE"
      : investigation
        ? isOllama
          ? "LOCAL OLLAMA ACTIVE"
          : "RESULT READY"
        : "AWAITING RUN";

  const providerLabel = isOllama ? "OLLAMA" : "HINDSIGHT";

  return (
    <motion.section
      className="panel reasoning-panel"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <div className="panel-header reasoning-panel__header">
        <div className="panel-heading">
          <div className="panel-kicker">
            <Cpu size={14} strokeWidth={1.8} />
            LOCAL AI REASONING
          </div>

          <h2>Ollama Incident Analysis</h2>

          <p>
            Local reasoning remains available when external memory services
            cannot be reached.
          </p>
        </div>

        <div
          className={`reasoning-status reasoning-status--${
            loading
              ? "running"
              : error
                ? "error"
                : investigation
                  ? "ready"
                  : "idle"
          }`}
        >
          <span className="reasoning-status__dot" />
          {statusLabel}
        </div>
      </div>

      <div className="reasoning-provider-strip">
        <div className="reasoning-provider">
          <Cpu size={15} />
          <span>PROVIDER</span>
          <strong>{providerLabel}</strong>
        </div>

        <div className="reasoning-provider">
          <Database size={15} />
          <span>HINDSIGHT MEMORY</span>
          <strong>
            {hindsightAvailable
              ? `${memoryCount} RECALLED`
              : "UNAVAILABLE"}
          </strong>
        </div>

        <div className="reasoning-provider">
          <ShieldCheck size={15} />
          <span>MODE</span>
          <strong>READ-ONLY GUIDANCE</strong>
        </div>
      </div>

      {error && (
        <motion.div
          className="reasoning-inline-error"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
        >
          <Sparkles size={15} />
          <span>{error}</span>
        </motion.div>
      )}

      {loading ? (
        <div className="reasoning-loading">
          <div className="reasoning-loading__orb">
            <BrainCircuit size={22} />
          </div>

          <div className="reasoning-loading__content">
            <strong>Analyzing incident context</strong>

            <span>
              Local agent is correlating the active incident with available
              engineering evidence.
            </span>
          </div>
        </div>
      ) : !investigation ? (
        <div className="reasoning-empty">
          <div className="reasoning-empty__icon">
            <BrainCircuit size={21} />
          </div>

          <div>
            <strong>
              Reasoning is waiting for an investigation run.
            </strong>

            <p>
              Start the incident investigation to generate local AI guidance.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="reasoning-summary">
            <div className="reasoning-summary__icon">
              <Sparkles size={18} />
            </div>

            <div>
              <span>AGENT SUMMARY</span>

              <p>
                {summary ||
                  "The local reasoning agent returned analysis without a separate summary."}
              </p>
            </div>
          </div>

          <div className="reasoning-signals">
            <Signal
              icon={Database}
              label="Memory"
              value={
                hindsightAvailable
                  ? `${memoryCount} recalled`
                  : "No historical memory"
              }
            />

            <Signal
              icon={Cpu}
              label="Reasoning"
              value={isOllama ? "Local model" : "Memory model"}
              tone={isOllama ? "active" : "default"}
            />

            <Signal
              icon={ShieldCheck}
              label="Safety"
              value="Read-only guidance"
              tone="safe"
            />

            <Signal
              icon={BrainCircuit}
              label="Evidence"
              value={
                hindsightAvailable
                  ? "Historical + current"
                  : "Current context only"
              }
            />
          </div>

          <ConfidenceBar value={confidence} />

          {reasoningText && (
            <div className="reasoning-details">
              <button
                type="button"
                className="reasoning-details__trigger"
                onClick={() => setExpanded((current) => !current)}
                aria-expanded={expanded}
              >
                <span>
                  <BrainCircuit size={15} />
                  VIEW REASONING TRACE
                </span>

                <ChevronDown
                  size={17}
                  className={expanded ? "is-open" : ""}
                />
              </button>

              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    className="reasoning-details__body"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{
                      duration: 0.25,
                      ease: "easeOut",
                    }}
                  >
                    <pre>{reasoningText}</pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </motion.section>
  );
}

export default ReasoningPanel;