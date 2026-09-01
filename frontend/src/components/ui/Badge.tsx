import * as React from "react"
import { cn } from "../../lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "failure" | "warning"
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider transition-colors",
        {
          "border-[var(--color-border-subtle)] text-[var(--color-ink)]": variant === "default",
          "border-[var(--color-success)] text-[var(--color-success)]": variant === "success",
          "border-[var(--color-failure)] text-[var(--color-failure)]": variant === "failure",
          "border-[var(--color-warning)] text-[var(--color-warning)]": variant === "warning",
        },
        className
      )}
      {...props}
    />
  )
}
