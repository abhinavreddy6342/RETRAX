import { CheckCircle2, XCircle, ShieldAlert, ArrowUpRight } from "lucide-react";
import { EmptyState } from "../common/EmptyState";

function EvidenceDetails({ memories = [] }) {
  if (!memories.length) return null;
  return (
    <details className="insight-provenance">
      <summary>Hindsight · {memories.length} source{memories.length === 1 ? "" : "s"}</summary>
      <div>
        {memories.slice(0, 4).map((memory, index) => (
          <article key={memory.id || memory.memory_id || index}>
            <span>{memory.source_incident_key || memory.type || memory.memory_type || "Hindsight memory"}</span>
            <p>{memory.text || memory.content}</p>
          </article>
        ))}
      </div>
    </details>
  );
}

function PatternItems({ items, unavailable, emptyText, itemClass }) {
  return (
    <div className="insight-list pattern-insight-list">
      {items.length > 0 ? (
        items.slice(0, 4).map((item, index) => (
          <div key={index} className={`insight-item ${itemClass}`}>
            <span className="insight-bullet" />
            <span>{item}</span>
          </div>
        ))
      ) : (
        <EmptyState text={unavailable ? "Historical patterns are unavailable; retry Hindsight when the service is ready." : emptyText} />
      )}
    </div>
  );
}

export function PatternsPanel({ analysis, unavailable = false }) {
  const successfulPatterns = analysis?.successful_patterns || [];
  const failedPatterns = analysis?.failed_patterns || [];
  const warnings = analysis?.warnings || [];

  const cards = [
    {
      kicker: "HISTORICAL SUCCESS",
      title: "What Worked",
      subtitle: "Remediation patterns that helped in prior incidents.",
      icon: CheckCircle2,
      items: successfulPatterns,
      empty: "No historical successful pattern was returned.",
      tone: "insight-worked",
      itemClass: "insight-item-success",
      iconClass: "icon-success",
    },
    {
      kicker: "HISTORICAL FAILURE",
      title: "What Failed",
      subtitle: "Actions recorded as unsuccessful in prior investigations.",
      icon: XCircle,
      items: failedPatterns,
      empty: "No historical failure pattern was returned.",
      tone: "insight-failed",
      itemClass: "insight-item-failure",
      iconClass: "icon-failure",
    },
    {
      kicker: "ANTI-PATTERN WARNING",
      title: "Don’t Repeat",
      subtitle: "Experience that should be treated as a caution signal.",
      icon: ShieldAlert,
      items: warnings,
      empty: "No historical warning was returned.",
      tone: "insight-danger",
      itemClass: "insight-item-danger",
      iconClass: "icon-danger",
    },
  ];

  return (
    <section className="patterns-grid command-intelligence-section">
      <div className="section-heading-row">
        <div>
          <span className="section-kicker">EXPERIENCE SIGNALS</span>
          <h2>What Worked / What Failed</h2>
          <p>Past outcomes become explicit guidance instead of hidden context.</p>
        </div>
        <span className="section-index">03</span>
      </div>

      <div className="patterns-card-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className={`panel insight-panel pattern-card ${card.tone}`}>
              <div className="pattern-card-top">
                <div className={`pattern-icon ${card.iconClass}`}><Icon size={16} /></div>
                <ArrowUpRight size={14} className="insight-header-icon" />
              </div>

              <div className="panel-kicker">{card.kicker}</div>
              <div className="panel-title">{card.title}</div>
              <p className="insight-subtitle">{card.subtitle}</p>

              <PatternItems
                items={card.items}
                unavailable={unavailable}
                emptyText={card.empty}
                itemClass={card.itemClass}
              />
              <EvidenceDetails memories={analysis?.historical_experience || []} />
            </article>
          );
        })}
      </div>
    </section>
  );
}
