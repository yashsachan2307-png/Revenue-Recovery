import * as React from "react"
import { cn } from "../../lib/utils"
import { Panel } from "./Panel"

interface MetricBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  trend?: "up" | "down" | "neutral"
  trendValue?: string
}

export function MetricBlock({ label, value, trend, trendValue, className, ...props }: MetricBlockProps) {
  return (
    <Panel className={cn("flex flex-col gap-2", className)} {...props}>
      <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink)]/70">
        {label}
      </div>
      <div className="financial-number text-2xl font-bold">
        {value}
      </div>
      {(trend || trendValue) && (
        <div className="flex items-center gap-2 text-xs font-medium">
          {trend && (
            <span
              className={cn({
                "text-[var(--color-success)]": trend === "up",
                "text-[var(--color-failure)]": trend === "down",
                "text-[var(--color-warning)]": trend === "neutral",
              })}
            >
              {trend === "up" ? "▲" : trend === "down" ? "▼" : "■"}
            </span>
          )}
          {trendValue && <span>{trendValue}</span>}
        </div>
      )}
    </Panel>
  )
}
