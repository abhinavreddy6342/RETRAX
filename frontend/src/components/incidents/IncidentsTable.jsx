import { motion } from "framer-motion";
import { ChevronRight, ArrowUpRight } from "lucide-react";
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

export function IncidentsTable({
  incidents = [],
  selectedIncidentId,
  onSelectIncident,
  onOpenWorkspace,
}) {
  return (
    <div className="table-responsive-container">
      <table className="incidents-table">
        <thead>
          <tr>
            <th>SEVERITY</th>
            <th>KEY</th>
            <th>TITLE</th>
            <th>SERVICE</th>
            <th>STATUS</th>
            <th>DETECTED</th>
            <th className="text-right">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((inc, index) => {
            const isSelected = inc.id === selectedIncidentId;
            const isInvestigating =
              String(inc.status || "").toLowerCase() === "investigating";

            return (
              <motion.tr
                key={inc.id || index}
                className={`table-row ${isSelected ? "table-row-selected" : ""} ${
                  isInvestigating ? "table-row-active" : ""
                }`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => onSelectIncident(inc)}
              >
                <td>
                  <SeverityBadge severity={inc.severity} />
                </td>

                <td className="font-mono text-cyan">
                  <div className="key-wrap">
                    <span>{inc.incident_key}</span>
                    {isInvestigating && (
                      <span className="live-dot-pulse" title="Active Incident" />
                    )}
                  </div>
                </td>

                <td className="title-cell">
                  <div className="table-title">{inc.title}</div>
                  {inc.current_error && (
                    <div className="table-error-preview">{inc.current_error}</div>
                  )}
                </td>

                <td>
                  <span className="service-name-tag">
                    {resolveServiceName(inc.service_id)}
                  </span>
                </td>

                <td>
                  <StatusBadge status={inc.status} />
                </td>

                <td className="time-cell">{formatIncidentDate(inc)}</td>

                <td className="text-right actions-cell" onClick={(e) => e.stopPropagation()}>
                  <div className="action-buttons-wrap">
                    <button
                      className="table-action-btn"
                      onClick={() => onSelectIncident(inc)}
                      title="Inspect incident details"
                    >
                      <span>Inspect</span>
                      <ChevronRight size={14} />
                    </button>

                    <button
                      className="table-command-btn"
                      onClick={() => onOpenWorkspace(inc.id)}
                      title="Open incident workspace"
                    >
                      <span>Workspace</span>
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
