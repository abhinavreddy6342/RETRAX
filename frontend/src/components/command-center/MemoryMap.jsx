import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { CircleDot, ExternalLink, Network, BrainCircuit } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const MemoryMapCanvas = lazy(() => import("./MemoryMapCanvas.jsx"));

function nodeLabel(item, index) {
  return item?.incident_key || item?.source_incident_key || item?.key || `Memory ${index + 1}`;
}

export function MemoryMap({ incident, memories = [], onOpenIncident }) {
  const [selected, setSelected] = useState(null);
  const reducedMotion = useReducedMotion();

  const nodes = useMemo(
    () => (Array.isArray(memories) ? memories : []).map((memory, index) => ({
      id: memory.memory_id || memory.id || `${index}`,
      label: nodeLabel(memory, index),
      title: memory.title || memory.content || memory.text || "Historical memory",
      content: memory.content || memory.text || "",
      source: memory.source_incident_key || memory.incident_key || null,
      type: memory.memory_type || "experience",
      status: /fail|warn|avoid/i.test(`${memory.memory_type || ""} ${memory.content || memory.text || ""}`) ? "warning" : "success",
    })),
    [memories],
  );

  const current = incident
    ? {
        id: incident.id,
        label: incident.incident_key || "Current incident",
        title: incident.title || "Current incident",
        status: String(incident.status || "").toLowerCase() === "resolved" ? "success" : "critical",
        current: true,
      }
    : null;

  const allNodes = current ? [current, ...nodes] : nodes;
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 680px)").matches);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 680px)");
    const onChange = (event) => setIsMobile(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const fallback = reducedMotion || isMobile || !current || nodes.length === 0;

  return (
    <section className="panel memory-map-panel command-memory-map" aria-labelledby="memory-map-title" id="memory-map">
      <div className="panel-header command-panel-header">
        <div>
          <div className="panel-kicker">INCIDENT ↔ EXPERIENCE</div>
          <h2 className="panel-title" id="memory-map-title">Memory Map</h2>
          <p className="section-subtitle">A spatial view of the current incident and the historical memories actually returned by Hindsight.</p>
        </div>
        <span className="memory-total"><Network size={13} /> {Array.isArray(memories) ? `${nodes.length} RECALLS` : "— RECALLS"}</span>
      </div>

      <div className="memory-map-legend">
        <span><i className="map-legend-dot current" /> Current incident</span>
        <span><i className="map-legend-dot success" /> Historical experience</span>
        <span><i className="map-legend-dot warning" /> Caution / failure signal</span>
      </div>

      {!Array.isArray(memories) ? (
        <div className="memory-map-fallback memory-map-state">
          <button type="button" className="memory-map-node is-current" onClick={() => onOpenIncident?.(incident?.id)}>
            <CircleDot size={15} />
            <span><strong>{current?.label}</strong><small>{current?.title}</small></span>
            <ExternalLink size={13} />
          </button>
          <p className="memory-map-note">Historical memory is unavailable or has not loaded yet.</p>
        </div>
      ) : nodes.length === 0 ? (
        <div className="memory-map-fallback memory-map-state">
          <button type="button" className="memory-map-node is-current" onClick={() => onOpenIncident?.(incident?.id)}>
            <BrainCircuit size={15} />
            <span><strong>{current?.label}</strong><small>{current?.title}</small></span>
            <ExternalLink size={13} />
          </button>
          <p className="memory-map-note">No historical memories were returned for this incident.</p>
        </div>
      ) : fallback ? (
        <div className="memory-map-fallback" role="list" aria-label="Incident and recalled memories">
          {allNodes.map((node, index) => (
            <motion.button
              type="button"
              role="listitem"
              key={node.id}
              className={`memory-map-node memory-node-${node.status || "info"} ${node.current ? "is-current" : ""}`}
              onClick={() => (node.current ? onOpenIncident?.(incident.id) : setSelected(node))}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.3 }}
            >
              <CircleDot size={15} />
              <span><strong>{node.label}</strong><small>{node.current ? node.title : node.content || node.title}</small></span>
              {node.current && <ExternalLink size={13} />}
            </motion.button>
          ))}
          <p className="memory-map-note">2D evidence view · adaptive for narrow screens and reduced-motion mode</p>
        </div>
      ) : (
        <Suspense fallback={<div className="memory-map-loading">Loading interactive memory map…</div>}>
          <MemoryMapCanvas
            current={current}
            nodes={nodes}
            onSelect={(node) => (node.current ? onOpenIncident?.(incident.id) : setSelected(node))}
          />
        </Suspense>
      )}

      {selected && (
        <motion.div className="memory-evidence-drawer" role="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <button type="button" aria-label="Close evidence" onClick={() => setSelected(null)}>×</button>
          <span className="panel-kicker">{selected.label} · {selected.type || "CURRENT INCIDENT"}</span>
          <p>{selected.content || selected.title}</p>
          {selected.source && <small>Source incident: {selected.source}</small>}
        </motion.div>
      )}
    </section>
  );
}
