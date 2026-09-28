import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Server, Activity, Database, TriangleAlert, Clock, ArrowUpRight, ShieldCheck } from "lucide-react";
import { SeverityBadge, StatusBadge } from "../common/StatusBadge";
import { resolveServiceName } from "../../api/incidents";

function formatDate(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    return d.toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return isoStr;
  }
}

export function IncidentDetailDrawer({
  isOpen,
  incident,
  onClose,
  onOpenWorkspace,
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !incident) return null;

  return (
    <AnimatePresence>
      <div className="drawer-backdrop" onClick={onClose}>
        <motion.aside
          className="incident-drawer"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="drawer-header">
            <div>
              <div className="drawer-kicker">INCIDENT TELEMETRY</div>
              <div className="drawer-key font-mono text-cyan">
                {incident.incident_key}
              </div>
            </div>

            <button className="icon-button" onClick={onClose} title="Close drawer (Esc)">
              <X size={18} />
            </button>
          </div>

          <div className="drawer-body">
            <div className="drawer-badges">
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
              {incident.environment && (
                <span className="env-badge">{incident.environment.toUpperCase()}</span>
              )}
            </div>

            <h2 className="drawer-title">{incident.title}</h2>

            <div className="drawer-section">
              <div className="drawer-section-label">
                <Server size={14} />
                <span>SERVICE</span>
              </div>
              <div className="drawer-section-value">
                {resolveServiceName(incident.service_id)}
              </div>
            </div>

            {incident.current_error && (
              <div className="drawer-section">
                <div className="drawer-section-label">
                  <Database size={14} />
                  <span>CURRENT FAILURE SIGNAL</span>
                </div>
                <div className="drawer-section-value code-box">
                  {incident.current_error}
                </div>
              </div>
            )}

            {incident.description && (
              <div className="drawer-section">
                <div className="drawer-section-label">
                  <Activity size={14} />
                  <span>DESCRIPTION</span>
                </div>
                <div className="drawer-section-value">
                  {incident.description}
                </div>
              </div>
            )}

            {incident.impact && (
              <div className="drawer-section">
                <div className="drawer-section-label">
                  <TriangleAlert size={14} />
                  <span>IMPACT ASSESSMENT</span>
                </div>
                <div className="drawer-section-value">
                  {incident.impact}
                </div>
              </div>
            )}

            {/* Render root_cause ONLY if provided by the actual API response */}
            {incident.root_cause && (
              <div className="drawer-section">
                <div className="drawer-section-label">
                  <ShieldCheck size={14} />
                  <span>ROOT CAUSE</span>
                </div>
                <div className="drawer-section-value">
                  {incident.root_cause}
                </div>
              </div>
            )}

            {incident.resolution_summary && (
              <div className="drawer-section">
                <div className="drawer-section-label">
                  <ShieldCheck size={14} />
                  <span>RESOLUTION SUMMARY</span>
                </div>
                <div className="drawer-section-value">
                  {incident.resolution_summary}
                </div>
              </div>
            )}

            <div className="drawer-section">
              <div className="drawer-section-label">
                <Clock size={14} />
                <span>TIMESTAMPS</span>
              </div>

              <div className="timestamp-grid">
                {incident.started_at && (
                  <div className="ts-cell">
                    <span>Started:</span>
                    <strong>{formatDate(incident.started_at)}</strong>
                  </div>
                )}

                {incident.detected_at && (
                  <div className="ts-cell">
                    <span>Detected:</span>
                    <strong>{formatDate(incident.detected_at)}</strong>
                  </div>
                )}

                {incident.resolved_at && (
                  <div className="ts-cell">
                    <span>Resolved:</span>
                    <strong>{formatDate(incident.resolved_at)}</strong>
                  </div>
                )}

                {incident.created_at && (
                  <div className="ts-cell">
                    <span>Created:</span>
                    <strong>{formatDate(incident.created_at)}</strong>
                  </div>
                )}

                {incident.updated_at && (
                  <div className="ts-cell">
                    <span>Updated:</span>
                    <strong>{formatDate(incident.updated_at)}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="drawer-footer" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {onOpenWorkspace && (
              <button
                className="primary-button full-width"
                onClick={() => onOpenWorkspace(incident)}
              >
                <span>Open War Room</span>
                <ArrowUpRight size={16} />
              </button>
            )}
            <button className="secondary-button full-width" onClick={onClose}>
              <span>Close Telemetry Drawer</span>
            </button>
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
}
