import { motion } from "framer-motion";
import { ShieldAlert, Activity, CheckCircle2, Database } from "lucide-react";

export function IncidentsMetrics({ incidents = [] }) {
  const total = incidents.length;

  const activeCount = incidents.filter(
    (inc) => String(inc.status || "").toLowerCase() !== "resolved"
  ).length;

  const investigatingCount = incidents.filter(
    (inc) => String(inc.status || "").toLowerCase() === "investigating"
  ).length;

  const resolvedCount = incidents.filter(
    (inc) => String(inc.status || "").toLowerCase() === "resolved"
  ).length;

  const metrics = [
    {
      label: "Total Incidents",
      value: total,
      icon: <Database size={18} />,
      meta: "Registry total",
    },
    {
      label: "Active Incidents",
      value: activeCount,
      icon: <ShieldAlert size={18} />,
      meta: "Requiring attention",
    },
    {
      label: "Investigating",
      value: investigatingCount,
      icon: <Activity size={18} />,
      meta: "Active investigation",
    },
    {
      label: "Resolved",
      value: resolvedCount,
      icon: <CheckCircle2 size={18} />,
      meta: "Historical resolutions",
    },
  ];

  return (
    <section className="metric-grid">
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.label}
          className="metric-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: index * 0.05 }}
          whileHover={{ y: -2 }}
        >
          <div className="metric-icon">{metric.icon}</div>

          <div className="metric-main">
            <div className="metric-label">{metric.label}</div>
            <div className="metric-value">{metric.value}</div>
            <div className="metric-meta">{metric.meta}</div>
          </div>
        </motion.div>
      ))}
    </section>
  );
}
