import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";

export function IncidentsHeader({ totalCount = 0 }) {
  return (
    <section className="hero-row">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="eyebrow">PRODUCTION INCIDENT HISTORY</div>

        <h1>
          Incidents
          <br />
          <span>Current and historical registry.</span>
        </h1>

        <p>
          Review active and resolved engineering incidents, inspect root telemetry,
          and leverage RETRAX historical memory for rapid resolution.
        </p>
      </motion.div>

      <motion.div
        className="hero-signal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="signal-ring">
          <ShieldAlert size={26} />
        </div>

        <div>
          <div className="signal-label">REGISTRY STATUS</div>
          <div className="signal-value">{totalCount} RECORDED</div>
        </div>
      </motion.div>
    </section>
  );
}
