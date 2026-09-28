import { motion } from "framer-motion";
import { History, BrainCircuit, ArrowUpRight } from "lucide-react";
import { EmptyState } from "../common/EmptyState";

export function MemoryGrid({ memoryItems }) {
  const items = Array.isArray(memoryItems) ? memoryItems : [];

  return (
    <section className="memory-section panel command-memory-section" id="memory-evidence">
      <div className="panel-header command-panel-header">
        <div>
          <div className="panel-kicker">HINDSIGHT MEMORY</div>
          <div className="panel-title">Recalled Engineering Experience</div>
          <p className="section-subtitle">The actual experience returned for this incident query, preserved as evidence.</p>
        </div>

        <div className="memory-total command-memory-total">
          <BrainCircuit size={13} />
          <span>{memoryItems == null ? "—" : `${items.length} RECALLS`}</span>
        </div>
      </div>

      <div className="memory-grid command-memory-grid">
        {items.length > 0 ? (
          items.slice(0, 6).map((item, index) => (
            <motion.article
              key={item.memory_id || item.id || index}
              className="memory-card command-memory-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.045, duration: 0.3 }}
              whileHover={{ y: -2 }}
            >
              <div className="memory-card-top">
                <span className="memory-type-badge">{item.memory_type || "experience"}</span>
                <ArrowUpRight size={13} className="memory-card-icon" />
              </div>

              <div className="memory-card-source">
                <History size={12} />
                <span>{item.source_incident_key || item.incident_key || "Historical experience"}</span>
              </div>

              <div className="memory-text">{item.content || item.text || "No memory content available."}</div>

              <div className="memory-footer">
                <span className="memory-source-tag">HINDSIGHT</span>
                <code className="memory-id-code">{String(item.memory_id || item.id || "").slice(0, 10)}</code>
              </div>
            </motion.article>
          ))
        ) : (
          <div className="memory-empty-wrap">
            <EmptyState text={memoryItems == null ? "Hindsight memory is unavailable or has not loaded yet." : "No historical memories were returned for this incident."} />
          </div>
        )}
      </div>
    </section>
  );
}
