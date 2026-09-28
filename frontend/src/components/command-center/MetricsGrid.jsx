import { motion } from "framer-motion";
import { ShieldAlert, BrainCircuit, Sparkles, ShieldCheck, ArrowUpRight } from "lucide-react";

export function MetricsGrid({
  activeIncidentsCount,
  memoryRecallCount,
  confidence,
  avoidedFailures,
}) {
  const metrics = [
    {
      label: "Active Incidents",
      value: activeIncidentsCount ?? "—",
      icon: ShieldAlert,
      meta: "Live incident registry",
      code: "OPS / 01",
      tone: "critical",
    },
    {
      label: "Memory Recall",
      value: memoryRecallCount ?? "—",
      icon: BrainCircuit,
      meta: "Historical experience",
      code: "MEM / 02",
      tone: "memory",
    },
    {
      label: "Agent Confidence",
      value: confidence != null ? `${confidence}%` : "—",
      icon: Sparkles,
      meta: "Current investigation",
      code: "AI / 03",
      tone: "confidence",
    },
    {
      label: "Avoided Failures",
      value: avoidedFailures ?? "—",
      icon: ShieldCheck,
      meta: "Evaluation evidence",
      code: "EVAL / 04",
      tone: "success",
    },
  ];

  return (
    <section className="metric-grid command-metric-grid" aria-label="Operational metrics">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <motion.article
            key={metric.label}
            className={`metric-card command-metric-card metric-tone-${metric.tone}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: index * 0.06, ease: "easeOut" }}
            whileHover={{ y: -3 }}
          >
            <div className="command-metric-top">
              <span className="command-metric-code">{metric.code}</span>
              <ArrowUpRight size={13} className="command-metric-arrow" />
            </div>

            <div className="command-metric-body">
              <div className="metric-icon">
                <Icon size={17} />
              </div>

              <div className="metric-main">
                <div className="metric-label">{metric.label}</div>
                <div className="metric-value">{metric.value}</div>
                <div className="metric-meta">{metric.meta}</div>
              </div>
            </div>

            <div className="command-metric-rule" />
          </motion.article>
        );
      })}
    </section>
  );
}
