import { useEffect, useRef, useState } from "react";
import { Bot, X } from "lucide-react";
import { IncidentAgentChat } from "../incident-workspace/IncidentAgentChat";
import { getIncident } from "../../api/incidents";

export function GlobalAgentLauncher({ incidentId, enabled = true }) {
  const dialogRef = useRef(null);
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!incidentId) return;
    let cancelled = false;
    getIncident(incidentId).then((data) => { if (!cancelled) { setIncident(data); setError(""); } }).catch(() => { if (!cancelled) { setIncident(null); setError("The current incident context could not be loaded."); } }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [incidentId]);
  if (!enabled || !incidentId) return null;
  const activeIncident = incident?.id === incidentId ? incident : null;
  function open() { if (activeIncident) dialogRef.current?.showModal(); }
  function close() { dialogRef.current?.close(); }
  return <>
    <button className="global-agent-launcher" type="button" onClick={open} disabled={!activeIncident} aria-label="Open RETRAX incident agent" title="Ask the incident response agent">
      <Bot size={19} /><span>{loading ? "Loading agent" : "Ask RETRAX"}</span>
    </button>
    <dialog ref={dialogRef} className="global-agent-dialog" aria-label="RETRAX incident response agent" onClick={(event) => { if (event.target === dialogRef.current) close(); }} onCancel={(event) => { event.preventDefault(); close(); }}>
      <header className="global-agent-header"><div><span className="panel-kicker">CURRENT INCIDENT CONTEXT</span><strong>{incident?.incident_key || "Loading incident…"}</strong></div><button type="button" className="icon-button" onClick={close} aria-label="Close agent"><X size={17} /></button></header>
      {error ? <div role="alert" className="global-agent-error">{error}</div> : activeIncident && <IncidentAgentChat incident={activeIncident} />}
    </dialog>
  </>;
}
