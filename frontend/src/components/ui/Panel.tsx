import * as React from "react"
import { cn } from "../../lib/utils"

export function Panel({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border border-[var(--color-border-subtle)] bg-[var(--color-paper)] p-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function PanelHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mb-4 border-b border-[var(--color-border-subtle)] pb-2 text-sm font-bold uppercase tracking-wider", className)}
      {...props}
    >
      {children}
    </div>
  )
}
