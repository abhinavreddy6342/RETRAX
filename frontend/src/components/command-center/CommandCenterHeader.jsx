import { BrainCircuit, Database, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export function CommandCenterHeader({ memoryCount }) {
  const hasMemory = memoryCount !== null && memoryCount !== undefined;

  return (
    <section className="hero-row command-center-hero" aria-label="RETRAX Command Center">
      <motion.div
        className="command-hero-copy"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        <div className="command-hero-topline">
          <span className="eyebrow command-eyebrow">
            <span className="live-pulse" />
            LIVE INCIDENT COMMAND
          </span>
          <span className="command-hero-classification">ENGINEERING EXPERIENCE INTELLIGENCE</span>
        </div>

        <h1>
          Engineering memory,
          <br />
          <span>when every second matters.</span>
        </h1>

        <p className="command-hero-description">
          RETRAX connects the active incident with verified historical engineering
          experience so investigation decisions can use what the team learned before.
        </p>

        <div className="command-hero-meta" aria-label="Command Center capabilities">
          <span><BrainCircuit size={13} /> HINDSIGHT MEMORY</span>
          <span><Database size={13} /> INCIDENT EVIDENCE</span>
          <span><ShieldCheck size={13} /> DECISION HISTORY</span>
        </div>
      </motion.div>

      <motion.div
        className={`hero-signal command-memory-signal ${hasMemory ? "is-ready" : "is-pending"}`}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, delay: 0.12, ease: "easeOut" }}
      >
        <div className="signal-ring command-signal-ring">
          <BrainCircuit size={25} />
          <span className="signal-ring-pulse" />
        </div>

        <div className="command-memory-signal-copy">
          <div className="signal-label">MEMORY SIGNAL</div>
          <strong>
            {hasMemory ? `${memoryCount} RECALL${Number(memoryCount) === 1 ? "" : "S"}` : "NO RECALL DATA"}
          </strong>
          <span>{hasMemory ? "Historical context available" : "Awaiting Hindsight response"}</span>
        </div>

        <div className="command-signal-index">01</div>
      </motion.div>
    </section>
  );
}
