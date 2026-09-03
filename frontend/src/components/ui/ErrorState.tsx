import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Failed to load system data",
  message = "A network or server error occurred while retrieving information.",
  onRetry,
  className = ""
}: ErrorStateProps) {
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div
      className={`border border-[var(--color-failure)] bg-[var(--color-failure)]/5 p-8 flex flex-col items-center justify-center text-center gap-4 my-6 ${className}`}
      role="alert"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-none border border-[var(--color-failure)] text-[var(--color-failure)] bg-[var(--color-paper)]">
        <AlertTriangle className="h-6 w-6" />
      </div>

      <div className="flex flex-col gap-1 max-w-md">
        <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-failure)]">
          {title}
        </h3>
        <p className="text-xs text-[var(--color-ink)]/70 font-mono">
          {message}
        </p>
      </div>

      {onRetry && (
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="flex items-center gap-2 border border-[var(--color-failure)] bg-[var(--color-paper)] text-[var(--color-failure)] px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[var(--color-failure)] hover:text-[var(--color-paper)] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`} />
          {isRetrying ? "Retrying..." : "Retry Request"}
        </button>
      )}
    </div>
  );
}
