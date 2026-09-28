export function SeverityBadge({ severity }) {
  const value = String(severity || "").toUpperCase();
  let className = "severity-badge";

  if (value === "SEV-1") className += " severity-critical";
  else if (value === "SEV-2") className += " severity-high";
  else if (value === "SEV-3") className += " severity-medium";
  else className += " severity-low";

  return <span className={className}>{value || "SEV-UNKNOWN"}</span>;
}

export function StatusBadge({ status }) {
  const normalized = String(status || "unknown").toLowerCase();
  let className = "status-badge";

  if (normalized === "investigating" || normalized === "active" || normalized === "open") className += " status-investigating";
  else if (normalized === "resolved" || normalized === "success") className += " status-resolved";
  else if (normalized === "failed" || normalized === "failure" || normalized === "error") className += " status-failed";

  return (
    <span className={className}>
      <span className="status-badge-dot" />
      {normalized.toUpperCase()}
    </span>
  );
}
