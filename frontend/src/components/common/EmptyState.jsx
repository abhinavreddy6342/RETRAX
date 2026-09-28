import { CircleDot } from "lucide-react";

export function EmptyState({ text = "No data available." }) {
  return (
    <div className="empty-state command-empty-state-inline" role="status">
      <span className="empty-state-icon"><CircleDot size={14} /></span>
      <span>{text}</span>
    </div>
  );
}
