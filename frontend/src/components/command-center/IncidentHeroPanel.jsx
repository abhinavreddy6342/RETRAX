import {
  Server,
  Activity,
  Database,
  TriangleAlert,
  BrainCircuit,
  ArrowRight,
  ChevronRight,
  Loader2,
  Radio,
  Clock3,
} from "lucide-react";
import { SeverityBadge, StatusBadge } from "../common/StatusBadge";
import { resolveServiceName } from "../../api/incidents";

export function IncidentHeroPanel({
  incident,
  investigating,
  onRunInvestigation,
  onOpenWorkspace,
}) {
  if (!incident) return null;

  const normalizedStatus = String(incident.status || "unknown").toLowerCase();
  const isResolved = normalizedStatus === "resolved";
  const serviceName = incident.service_name || resolveServiceName(incident.service_id);

  return (
    <article className={`panel incident-panel incident-command-primary ${isResolved ? "is-resolved" : "is-live"}`}>
      <div className="incident-panel-accent" />

      <div className="panel-header incident-command-header">
        <div>
          <div className="panel-kicker">{isResolved ? "INCIDENT RECORD" : "ACTIVE INCIDENT"}</div>
          <div className="panel-title">Incident Command</div>
        </div>

        <div className="incident-header-state">
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} />
        </div>
      </div>

      <div className="incident-identity-bar">
        <div className="incident-identity-main">
          <span className="incident-live-mark">
            <Radio size={11} />
            {isResolved ? "ARCHIVED" : "LIVE"}
          </span>
          <code className="incident-key-code">{incident.incident_key || "INCIDENT-UNKNOWN"}</code>
        </div>

        <div className="incident-service-chip">
          <Server size={12} />
          <span>{serviceName}</span>
        </div>
      </div>

      <div className="incident-command-title-wrap">
        <span className="incident-command-label">CURRENT EVENT</span>
        <h2 className="incident-title">{incident.title}</h2>
      </div>

      <div className="incident-meta-grid incident-command-meta">
        <div className="info-cell incident-context-cell">
          <div className="info-label">
            <Activity size={14} />
            <span>STATUS</span>
          </div>
          <div className={`info-value status-text-${normalizedStatus}`}>
            {incident.status || "Unknown"}
          </div>
          <small className="incident-meta-hint">Current incident lifecycle state</small>
        </div>

        <div className="info-cell incident-context-cell">
          <div className="info-label">
            <Clock3 size={14} />
            <span>COMMAND STATE</span>
          </div>
          <div className="info-value">{isResolved ? "Record available" : "Investigation in progress"}</div>
          <small className="incident-meta-hint">Operator-controlled incident workflow</small>
        </div>

        <div className="info-cell full-span signal-cell-primary">
          <div className="info-label">
            <Database size={14} />
            <span>FAILURE SIGNAL</span>
          </div>
          <div className="failure-signal-box">
            <span className="failure-signal-prefix">TRACE</span>
            <code>{incident.current_error || "No error trace captured"}</code>
          </div>
        </div>

        <div className="info-cell full-span impact-cell-primary">
          <div className="info-label">
            <TriangleAlert size={14} />
            <span>IMPACT</span>
          </div>
          <div className="info-value impact-value">
            {incident.impact || incident.description || "Impact assessment pending"}
          </div>
        </div>
      </div>

      <div className="incident-command-footer">
        <div className="incident-footer-copy">
          <span className="incident-footer-kicker">NEXT DECISION</span>
          <strong>Use historical evidence before changing production state.</strong>
        </div>

        <div className="incident-actions">
          <button
            className="primary-button primary-command-action"
            onClick={onRunInvestigation}
            disabled={investigating}
          >
            {investigating ? (
              <>
                <Loader2 size={15} className="spin" />
                <span>Refreshing Hindsight...</span>
              </>
            ) : (
              <>
                <BrainCircuit size={15} />
                <span>Run Hindsight Investigation</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>

          <button className="secondary-button" onClick={onOpenWorkspace}>
            <span>Open Workspace</span>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}
