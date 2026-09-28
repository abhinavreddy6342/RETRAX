import { motion } from "framer-motion";
import { ChevronRight, ArrowUpRight, Clock } from "lucide-react";
import { SeverityBadge, StatusBadge } from "../common/StatusBadge";
import { resolveServiceName } from "../../api/incidents";

function formatIncidentDate(incident) {
  const rawDate =
    incident.detected_at ||
    incident.started_at ||
    incident.created_at ||
    incident.updated_at;

  if (!rawDate) return "—";

  try {
    const d = new Date(rawDate);
    return d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function IncidentsCardGrid({
  incidents = [],
  selectedIncidentId,
  onSelectIncident,
  onOpenWorkspace,
}) {
  return (
    <div className="incidents-mobile-grid">
      {incidents.map((inc, index) => {
        const isSelected = inc.id === selectedIncidentId;

        return (
          <motion.article
            key={inc.id || index}
            className={`incident-mobile-card ${isSelected ? "mobile-card-selected" : ""}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            onClick={() => onSelectIncident(inc)}
          >
            <div className="mobile-card-header">
              <div className="mobile-card-badges">
                <SeverityBadge severity={inc.severity} />
                <StatusBadge status={inc.status} />
              </div>

              <span className="font-mono text-cyan mobile-key">{inc.incident_key}</span>
            </div>

            <h3 className="mobile-card-title">{inc.title}</h3>

            {inc.current_error && (
              <div className="mobile-card-error">{inc.current_error}</div>
            )}

            <div className="mobile-card-meta">
              <span className="service-name-tag">
                {resolveServiceName(inc.service_id)}
              </span>

              <span className="mobile-card-time">
                <Clock size={12} />
                <span>{formatIncidentDate(inc)}</span>
              </span>
            </div>

            <div className="mobile-card-actions" onClick={(e) => e.stopPropagation()}>
              <button
                className="table-action-btn full-flex"
                onClick={() => onSelectIncident(inc)}
              >
                <span>Inspect Details</span>
                <ChevronRight size={14} />
              </button>

              <button
                className="table-command-btn full-flex"
                onClick={() => onOpenWorkspace(inc.id)}
              >
                <span>Workspace</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}
