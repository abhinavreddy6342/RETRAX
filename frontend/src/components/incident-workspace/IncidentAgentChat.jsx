import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  BrainCircuit,
  Check,
  CircleHelp,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import { chatAboutIncident } from "../../api/investigations";

const starterQuestions = [
  "What is happening?",
  "Have we seen this before?",
  "What should I investigate next?",
  "What should I avoid repeating?",
];

function formatInline(text, keyPrefix) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={`${keyPrefix}-${index}`}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

function AgentFormattedAnswer({ text }) {
  const blocks = text.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  return (
    <div className="agent-rich-answer">
      {blocks.map((block, index) => {
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
        if (lines.length === 1 && /^#{1,4}\s/.test(lines[0])) {
          return <h4 key={index}>{formatInline(lines[0].replace(/^#{1,4}\s+/, ""), index)}</h4>;
        }
        if (lines.every((line) => /^[-*]\s+/.test(line))) {
          return <ul key={index}>{lines.map((line, itemIndex) => <li key={itemIndex}>{formatInline(line.replace(/^[-*]\s+/, ""), `${index}-${itemIndex}`)}</li>)}</ul>;
        }
        if (lines.every((line) => /^\d+[.)]\s+/.test(line))) {
          return <ol key={index}>{lines.map((line, itemIndex) => <li key={itemIndex}>{formatInline(line.replace(/^\d+[.)]\s+/, ""), `${index}-${itemIndex}`)}</li>)}</ol>;
        }
        if (lines.every((line) => /^\|.*\|$/.test(line))) {
          const rows = lines.filter((line) => !/^\|[\s|:-]+\|$/.test(line)).map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
          return rows.length > 0 ? (
            <div className="agent-table-wrap" key={index}>
              <table><tbody>{rows.map((row, rowIndex) => {
                const Cell = rowIndex === 0 ? "th" : "td";
                return <tr key={rowIndex}>{row.map((cell, cellIndex) => <Cell key={cellIndex}>{formatInline(cell, `${index}-${rowIndex}-${cellIndex}`)}</Cell>)}</tr>;
              })}</tbody></table>
            </div>
          ) : null;
        }
        return (
          <div className="agent-rich-paragraph" key={index}>
            {lines.map((line, lineIndex) => {
              const heading = line.match(/^#{1,4}\s+(.+)$/);
              return heading
                ? <h4 key={lineIndex}>{formatInline(heading[1], `${index}-${lineIndex}`)}</h4>
                : <p key={lineIndex}>{formatInline(line.replace(/^\*\s+/, ""), `${index}-${lineIndex}`)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

function AgentAnswer({ message, onPrepareAction }) {
  const response = message.response;
  return (
    <div className="agent-answer-content">
      <AgentFormattedAnswer text={response.answer} />

      {response.recommended_actions?.length > 0 && (
        <section className="agent-answer-section">
          <div className="agent-answer-label">Suggested investigation</div>
          {response.recommended_actions.map((action, index) => (
            <div className="agent-suggestion-card" key={`${index}-${action}`}>
              <span>{action}</span>
              <button type="button" onClick={() => onPrepareAction(action)} title="Prepare this action for review">
                <ArrowUpRight size={13} /> Prepare
              </button>
            </div>
          ))}
          <div className="agent-inline-note">Preparing an action only fills the review form. It is not recorded until you submit it.</div>
        </section>
      )}

      {response.warnings?.length > 0 && (
        <section className="agent-warning-list">
          <div className="agent-answer-label"><AlertTriangle size={13} /> Avoid repeating</div>
          {response.warnings.map((warning, index) => <p key={`${index}-${warning}`}>{warning}</p>)}
        </section>
      )}

      <div className="agent-response-meta">
        <span className={`memory-state memory-state-${response.historical_memory_status}`}>
          <span className="memory-state-dot" />
          {response.historical_memory_status === "available" ? "HINDSIGHT CONNECTED" : response.historical_memory_status === "partial" ? "PARTIAL MEMORY CONTEXT" : "HISTORICAL MEMORY UNAVAILABLE"}
        </span>
        {response.memories_used !== null && response.memories_used !== undefined && (
          <span><BrainCircuit size={12} /> {response.memories_used} memories</span>
        )}
      </div>

      {response.sources?.length > 0 && (
        <details className="agent-source-list">
          <summary>Evidence · {response.sources.length} source{response.sources.length === 1 ? "" : "s"}</summary>
          <div className="agent-source-items">
            {response.sources.map((source, index) => (
              <article className="agent-source-card" key={source.memory_id || index}>
                <div className="agent-source-heading">
                  <span>{source.source_incident_key || source.memory_type || "Hindsight memory"}</span>
                  {source.score !== null && source.score !== undefined && <span>{Math.round(source.score * 100)}% match</span>}
                </div>
                <p>{source.content}</p>
              </article>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export function IncidentAgentChat({ incident, onPrepareAction }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [turn, setTurn] = useState(0);
  const feedRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages, loading]);

  function startNewConversation() {
    setMessages([]);
    setDraft("");
    setError("");
    setTurn((value) => value + 1);
    inputRef.current?.focus();
  }

  async function sendMessage(event, suggestedQuestion, isRetry = false) {
    event?.preventDefault();
    const messageText = (suggestedQuestion || draft).trim();
    if (!messageText || loading || !incident?.id) return;

    const previousMessages = messages;
    if (!isRetry) setMessages((current) => [...current, { role: "user", content: messageText }]);
    setDraft("");
    setError("");
    setLoading(true);

    try {
      const history = previousMessages
        .filter((item) => item.role === "user" || item.role === "assistant")
        .slice(-12)
        .map((item) => ({ role: item.role, content: item.content.slice(0, 3000) }));
      const response = await chatAboutIncident(incident.id, {
        message: messageText,
        history,
      });
      setMessages((current) => [...current, {
        role: "assistant",
        content: response.answer,
        response,
      }]);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "The incident agent could not respond. Your message is still here; you can retry.");
      setDraft(messageText);
    } finally {
      setLoading(false);
    }
  }

  function handleInputKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(event);
    }
  }

  return (
    <section className="incident-agent-console" aria-label="RETRAX incident response agent">
      <header className="agent-console-header">
        <div className="agent-identity">
          <div className="agent-mark"><Sparkles size={16} /></div>
          <div>
            <div className="agent-eyebrow">RETRAX · INCIDENT RESPONSE AGENT</div>
            <h2 className="agent-display-title">Ask the incident.</h2>
            <p>Answers use this incident, its investigation trail, and Hindsight memory.</p>
          </div>
        </div>
        <button className="agent-new-chat" type="button" onClick={startNewConversation} title="Start a new conversation">
          <RotateCcw size={13} /> <span>New</span>
        </button>
      </header>

      <div className="agent-incident-context">
        <span className="agent-context-severity">{incident.severity || "SEV ?"}</span>
        <span className="agent-context-key">{incident.incident_key}</span>
        <span className="agent-context-title">{incident.title}</span>
      </div>

      <div className="agent-conversation" ref={feedRef} aria-live="polite" aria-label="Conversation">
        {messages.length === 0 ? (
          <div className="agent-empty-state" key={turn}>
            <div className="agent-empty-icon"><CircleHelp size={19} /></div>
            <h3>What do you need to know?</h3>
            <p>I can help investigate this incident. Ask about its current signal, prior experience, attempted actions, or safe next steps.</p>
            <div className="agent-question-list">
              {starterQuestions.map((question) => (
                <button type="button" key={question} disabled={loading} onClick={() => sendMessage(null, question)}>
                  {question}<ArrowUpRight size={12} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="agent-message-list">
            <AnimatePresence initial={false}>
              {messages.map((message, index) => (
                <motion.article
                  className={`agent-message agent-message-${message.role}`}
                  key={`${index}-${message.role}-${message.content.slice(0, 24)}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {message.role === "assistant" && <div className="agent-message-mark"><BrainCircuit size={14} /></div>}
                  <div className="agent-message-card">
                    <div className="agent-message-label">{message.role === "assistant" ? "RETRAX AGENT" : "YOU"}</div>
                    {message.role === "assistant"
                      ? <AgentAnswer message={message} onPrepareAction={onPrepareAction} />
                      : <p>{message.content}</p>}
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
            {loading && (
              <div className="agent-thinking"><Loader2 size={14} className="spin" /> Checking incident context and historical memory…</div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="agent-chat-error" role="alert">
          <AlertTriangle size={14} />
          <span>Unable to reach the incident-response agent. {error}</span>
          <button type="button" disabled={loading} onClick={() => sendMessage(null, draft, true)}>Retry</button>
        </div>
      )}

      <form className="agent-composer" onSubmit={sendMessage}>
        <label className="sr-only" htmlFor="incident-agent-message">Ask RETRAX about this incident</label>
        <textarea
          id="incident-agent-message"
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Ask about the failure, history, or next step…"
          rows={2}
          maxLength={4000}
          disabled={loading}
        />
        <div className="agent-composer-footer">
          <span>Enter to send · Shift + Enter for a new line</span>
          <button type="submit" disabled={loading || !draft.trim()} aria-label="Send message">
            {loading ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
          </button>
        </div>
      </form>
      <div className="agent-safety-note"><Check size={12} /> RETRAX recommends and records. It does not run production commands.</div>
    </section>
  );
}
