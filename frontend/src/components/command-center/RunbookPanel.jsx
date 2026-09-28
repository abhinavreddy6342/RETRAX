import { Terminal, AlertTriangle, ArrowRight, Gauge, History, ShieldCheck } from "lucide-react";
import { EmptyState } from "../common/EmptyState";

export function RunbookPanel({ runbooks, unavailable = false, onInspectRunbooks }) {
  const topRunbook = runbooks && runbooks.length > 0 ? runbooks[0] : null;
  const relevance = topRunbook?.relevance_score == null ? null : Math.max(0, Math.min(100, Math.round(Number(topRunbook.relevance_score) * 100)));

  return (
    <article className="panel runbook-panel command-runbook-panel">
      <div className="panel-header command-panel-header">
        <div>
          <div className="panel-kicker">RUNBOOK EXPERIENCE</div>
          <div className="panel-title">Recommended Recovery</div>
          <p className="section-subtitle">Recommendation shaped by runbook history for this incident.</p>
        </div>
        <div className="runbook-header-mark"><Terminal size={16} /></div>
      </div>

      {topRunbook ? (
        <div className="runbook-body">
          <div className="runbook-identity-row">
            <div>
              <span className="runbook-label">RECOMMENDED RUNBOOK</span>
              <div className="runbook-name">{topRunbook.runbook_name}</div>
            </div>
            <span className="runbook-experience-badge"><History size={12} /> {topRunbook.experience_count ?? "—"}</span>
          </div>

          <div className="runbook-score command-runbook-score">
            <div className="runbook-score-main">
              <div className="runbook-score-label"><span><Gauge size={12} /> RELEVANCE</span><strong>{relevance == null ? "—" : `${relevance}%`}</strong></div>
              <div className="runbook-progress"><span style={{ width: relevance == null ? "0%" : `${relevance}%` }} /></div>
            </div>
            <div className="runbook-execution-stat">
              <span>EXPERIENCE</span>
              <strong>{topRunbook.experience_count == null ? "—" : `${topRunbook.experience_count} runs`}</strong>
            </div>
          </div>

          <div className="runbook-copy">{topRunbook.why_recommended || "No recommendation rationale was returned."}</div>

          {topRunbook.known_success_pattern && (
            <div className="runbook-pattern pattern-success">
              <ShieldCheck size={14} />
              <span><strong>Known success condition</strong>{topRunbook.known_success_pattern}</span>
            </div>
          )}

          {topRunbook.known_failure_pattern && (
            <div className="runbook-pattern pattern-failure">
              <AlertTriangle size={14} />
              <span><strong>Known failure condition</strong>{topRunbook.known_failure_pattern}</span>
            </div>
          )}

          {topRunbook.caution && (
            <div className="caution-box">
              <AlertTriangle size={15} />
              <span>{topRunbook.caution}</span>
            </div>
          )}

          <button className="secondary-button full-width margin-top-auto" type="button" onClick={onInspectRunbooks}>
            <span>Inspect Runbook Experience</span>
            <ArrowRight size={15} />
          </button>
        </div>
      ) : (
        <EmptyState text={unavailable ? "Hindsight could not load a runbook recommendation. Check the connection or credits, then retry." : "No runbook recommendation was returned for this incident."} />
      )}
    </article>
  );
}