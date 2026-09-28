import { motion } from "framer-motion";
import { TriangleAlert, RefreshCw } from "lucide-react";

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;

  return (
    <motion.div
      className="alert-banner command-alert-banner"
      role="alert"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
    >
      <div className="alert-content">
        <span className="alert-icon-wrap"><TriangleAlert size={15} /></span>
        <span>{message}</span>
      </div>

      {onRetry && (
        <button className="alert-retry-btn" type="button" onClick={onRetry}>
          <RefreshCw size={12} />
          <span>Retry</span>
        </button>
      )}
    </motion.div>
  );
}
