import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, CircleDot, Plus, ChevronDown, ChevronUp, Clock3 } from "lucide-react";
import { EmptyState } from "../common/EmptyState";

function formatTimestamp(timestampStr) {
  if (!timestampStr) return "—";
  const date = new Date(timestampStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function DecisionTrajectory({ trajectory, onRecordActionClick }) {
  const [expandedEvidenceId, setExpandedEvidenceId] = useState(null);

  const successfulCount = trajectory?.successful_actions ?? null;
  const failedCount = trajectory?.failed_actions ?? null;
  const totalActions = trajectory?.total_actions ?? trajectory?.timeline?.length ?? null;
  const evaluatedCount = trajectory
    ? Math.max(0, Number(totalActions || 0) - Number(successfulCount || 0) - Number(failedCount || 0))
    : null;
  const timelineItems = trajectory?.timeline || [];

  const toggleEvidence = (id) => {
    setExpandedEvidenceId((current) => (current === id ? null : id));
  };

  return (
    <article className="panel trajectory-panel command-trajectory-panel" id="trajectory">
      <div className="panel-header command-panel-header">
        <div>
          <div className="panel-kicker">DECISION TRAJECTORY</div>
          <div className="panel-title">Investigation History</div>
          <p className="section-subtitle">A chronological record of what the engineer tried and what happened.</p>
        </div>

        <div className="trajectory-header-actions">
          <span className="trajectory-count">{totalActions ?? "—"} ACTIONS</span>
          <button className="primary-button-sm" type="button" onClick={onRecordActionClick}>
            <Plus size={13} />
            <span>Record Action</span>
          </button>
        </div>
      </div>

      <div className="trajectory-stats command-trajectory-stats">
        <div className="mini-stat mini-stat-positive">
          <span>SUCCESSFUL</span>
          <strong>{successfulCount ?? "—"}</strong>
        </div>

        <div className="mini-stat mini-stat-negative">
          <span>FAILED</span>
          <strong>{failedCount ?? "—"}</strong>
        </div>

        <div className="mini-stat mini-stat-neutral">
          <span>EVALUATED</span>
          <strong>{evaluatedCount ?? "—"}</strong>
        </div>

        <div className="mini-stat">
          <span>ACTIVE HYPOTHESIS</span>
          <strong>{trajectory ? (trajectory.active_hypothesis_id ? "1" : "0") : "—"}</strong>
        </div>
      </div>

      <div className="trajectory-legend">
        <span><i className="legend-dot legend-success" /> Successful</span>
        <span><i className="legend-dot legend-failure" /> Failed</span>
        <span><i className="legend-dot legend-evaluated" /> Evaluated / other</span>
      </div>

      <div className="timeline command-timeline">
        <AnimatePresence initial={false}>
          {timelineItems.length > 0 ? (
            timelineItems.slice(-8).map((item, index) => {
              const result = String(item.status || "").toLowerCase();
              const isSuccess = result === "success";
              const isFailure = result === "failure";
              const stableId = item.id || `${item.timestamp || "item"}-${index}`;
              const isExpanded = expandedEvidenceId === stableId;
              const hasDetails = Boolean(item.description || item.reason || (item.evidence && item.evidence.length));

              return (
                <motion.div
                  key={stableId}
                  className={`timeline-item command-timeline-item ${isSuccess ? "timeline-success" : isFailure ? "timeline-failure" : "timeline-evaluated"}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.035, duration: 0.25 }}
                  layout
                >
                  <div className={`timeline-dot ${isSuccess ? "dot-success" : isFailure ? "dot-failure" : "dot-evaluated"}`}>
                    {isSuccess ? <CheckCircle2 size={13} /> : isFailure ? <XCircle size={13} /> : <CircleDot size={13} />}
                  </div>

                  <div className="timeline-content">
                    <div className="timeline-top">
                      <span className="timeline-type-tag">
                        {isSuccess ? "SUCCESS" : isFailure ? "FAILURE" : "EVALUATED"}
                      </span>
                      <time className="timeline-time"><Clock3 size={11} /> {formatTimestamp(item.timestamp)}</time>
                    </div>

                    <div className="timeline-title">{item.title || "Investigation event"}</div>
                    {item.description && <div className="timeline-description">{item.description}</div>}

                    {hasDetails && (
                      <button
                        className="timeline-evidence-toggle"
                        type="button"
                        onClick={() => toggleEvidence(stableId)}
                        aria-expanded={isExpanded}
                      >
                        <span>{isExpanded ? "Hide Evidence" : "View Evidence"}</span>
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    )}

                    {isExpanded && (
                      <motion.div
                        className="timeline-evidence-box"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ duration: 0.2 }}
                      >
                        {item.reason && (
                          <div className="evidence-row">
                            <strong>Reason</strong>
                            <span>{item.reason}</span>
                          </div>
                        )}
                        {item.evidence?.length > 0 && (
                          <div className="evidence-row">
                            <strong>Evidence</strong>
                            <ul className="evidence-list">
                              {item.evidence.map((ev, i) => <li key={i}>{ev}</li>)}
                            </ul>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })
          ) : (
            <EmptyState text="Investigation timeline will appear here as actions are taken." />
          )}
        </AnimatePresence>
      </div>
    </article>
  );
}
