import { GitBranch, Network, Info, ArrowUpRight } from "lucide-react";
import { EmptyState } from "../common/EmptyState";

function EvidenceSources({ memories = [] }) {
  if (!memories.length) return null;
  return (
    <details className="insight-provenance">
      <summary>Hindsight · {memories.length} recalled source{memories.length === 1 ? "" : "s"}</summary>
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

function InsightList({ items, unavailable, emptyText, tone }) {
  return (
    <div className={`insight-list comparison-insight-list ${tone}`}>
      {items.length > 0 ? (
        items.slice(0, 5).map((item, index) => (
          <div key={index} className="insight-item">
            <span className="insight-bullet" />
            <span>{item}</span>
          </div>
        ))
      ) : (
        <EmptyState text={unavailable ? "Historical comparison is unavailable; check Hindsight and retry." : emptyText} />
      )}
    </div>
  );
}

export function ComparisonPanel({ comparison, historicalExperience = [], unavailable = false }) {
  const similarities = comparison?.similarities || [];
  const differences = comparison?.differences || [];

  return (
    <section className="comparison-section command-intelligence-section">
      <div className="section-heading-row">
        <div>
          <span className="section-kicker">CONTEXTUAL REASONING</span>
          <h2>Why Similar <span>/</span> Why Different</h2>
          <p>RETRAX compares historical evidence without treating two incidents as identical.</p>
        </div>
        <span className="section-index">02</span>
      </div>

      <div className="section-meta-banner comparison-meta-banner">
        <Info size={15} />
        <span>Shared signals can guide investigation; contextual differences can change the safest response.</span>
      </div>

      <div className="insight-grid comparison-insight-grid">
        <article className="panel insight-panel insight-similar comparison-card">
          <div className="comparison-card-mark"><GitBranch size={16} /></div>
          <div className="panel-header">
            <div>
              <div className="panel-kicker">HISTORICAL MATCH</div>
              <div className="panel-title">Why Similar</div>
              <p className="insight-subtitle">Signals shared with recalled engineering experience.</p>
            </div>
            <ArrowUpRight size={15} className="insight-header-icon" />
          </div>
          <EvidenceSources memories={historicalExperience} />
          <InsightList
            items={similarities}
            unavailable={unavailable}
            emptyText="No similarity findings were returned. Run investigation to refresh."
            tone="tone-similar"
          />
        </article>

        <article className="panel insight-panel insight-different comparison-card">
          <div className="comparison-card-mark is-different"><Network size={16} /></div>
          <div className="panel-header">
            <div>
              <div className="panel-kicker">CONTEXT CHECK</div>
              <div className="panel-title">Why Different</div>
              <p className="insight-subtitle">Differences that may change the response.</p>
            </div>
            <ArrowUpRight size={15} className="insight-header-icon" />
          </div>
          <EvidenceSources memories={historicalExperience} />
          <InsightList
            items={differences}
            unavailable={unavailable}
            emptyText="No contextual differences were returned. Run investigation to refresh."
            tone="tone-different"
          />
        </article>
      </div>
    </section>
  );
}
