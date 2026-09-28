import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, CheckCircle2, XCircle, CircleDot } from "lucide-react";

export function EngineerActionModal({ isOpen, onClose, onSubmit, submitting }) {
  const [action, setAction] = useState("");
  const [result, setResult] = useState("success");
  const [actor, setActor] = useState("abhinav");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !submitting) onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, submitting]);

  if (!isOpen) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!action.trim()) return;

    onSubmit({
      action: action.trim(),
      result,
      actor: actor.trim() || "operator",
      reason: reason.trim() || null,
      evidence: evidence.split("\n").map((line) => line.trim()).filter(Boolean),
    });
  };

  const ResultIcon = result === "success" ? CheckCircle2 : result === "failure" ? XCircle : CircleDot;

  return (
    <AnimatePresence>
      <div className="modal-backdrop command-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !submitting && onClose?.()}>
        <motion.div
          className="modal-card command-action-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="engineer-action-title"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="modal-header command-modal-header">
            <div>
              <div className="panel-kicker">ENGINEER ACTION</div>
              <h3 className="modal-title" id="engineer-action-title">Record Investigation Action</h3>
              <p className="modal-subtitle">Add an operator decision and its observed outcome to the incident trajectory.</p>
            </div>
            <button className="icon-button modal-close-button" type="button" onClick={onClose} disabled={submitting} aria-label="Close action dialog">
              <X size={17} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="modal-form command-modal-form">
            <div className="action-retention-note">
              <strong>Audit + memory:</strong> the action is persisted in incident history; Hindsight retention is attempted by the backend and is not individually acknowledged by this API.
            </div>

            <div className="form-group">
              <label htmlFor="action-input">Action Taken *</label>
              <input id="action-input" type="text" className="form-input" placeholder="e.g. Reduce connection pool safely to 15 connections" value={action} onChange={(event) => setAction(event.target.value)} required autoFocus />
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label htmlFor="result-select">Outcome Result *</label>
                <div className="result-select-shell">
                  <ResultIcon size={14} className={`result-icon result-${result}`} />
                  <select id="result-select" className="form-select" value={result} onChange={(event) => setResult(event.target.value)}>
                    <option value="success">Success</option>
                    <option value="failure">Failure</option>
                    <option value="inconclusive">Inconclusive</option>
                  </select>
                </div>
              </div>

              <div className="form-group flex-1">
                <label htmlFor="actor-input">Actor / Operator *</label>
                <input id="actor-input" type="text" className="form-input" placeholder="e.g. abhinav" value={actor} onChange={(event) => setActor(event.target.value)} required />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reason-input">Reasoning / Rationale</label>
              <textarea id="reason-input" className="form-textarea" rows={3} placeholder="Why was this action chosen?" value={reason} onChange={(event) => setReason(event.target.value)} />
            </div>

            <div className="form-group">
              <label htmlFor="evidence-input">Observed Evidence · one per line</label>
              <textarea id="evidence-input" className="form-textarea" rows={3} placeholder={'Active DB connections dropped below target\n5xx error rate stabilized'} value={evidence} onChange={(event) => setEvidence(event.target.value)} />
            </div>

            <div className="modal-footer command-modal-footer">
              <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>Cancel</button>
              <button type="submit" className="primary-button" disabled={submitting || !action.trim()}>
                {submitting ? <><Loader2 size={15} className="spin" /><span>Persisting...</span></> : <><Send size={15} /><span>Record Action</span></>}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
