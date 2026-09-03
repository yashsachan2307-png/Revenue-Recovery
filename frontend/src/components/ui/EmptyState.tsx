import * as React from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title = "No records found",
  message = "There are currently no items to display matching your criteria.",
  actionLabel,
  onAction,
  icon,
  className = ""
}: EmptyStateProps) {
  return (
    <div
      className={`border border-[var(--color-border-subtle)] border-dashed p-10 flex flex-col items-center justify-center text-center gap-3 bg-[var(--color-ink)]/[0.02] ${className}`}
    >
      <div className="flex h-10 w-10 items-center justify-center border border-[var(--color-border-subtle)] text-[var(--color-ink)]/50 bg-[var(--color-paper)] mb-1">
        {icon || <Inbox className="h-5 w-5" />}
      </div>

      <div className="flex flex-col gap-1 max-w-sm">
        <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink)]">
          {title}
        </h4>
        <p className="text-xs text-[var(--color-ink)]/60 font-mono">
          {message}
        </p>
      </div>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-2 border border-[var(--color-ink)] bg-[var(--color-paper)] text-[var(--color-ink)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-[var(--color-ink)] hover:text-[var(--color-paper)] transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
