import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost"
  size?: "sm" | "md" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap border text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          {
            "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)] hover:bg-[var(--color-ink)]/90":
              variant === "primary",
            "border-[var(--color-border-subtle)] bg-transparent hover:bg-[var(--color-ink)] hover:text-[var(--color-paper)]":
              variant === "secondary",
            "border-[var(--color-failure)] bg-[var(--color-failure)] text-white hover:bg-[var(--color-failure)]/90":
              variant === "danger",
            "border-transparent bg-transparent hover:bg-[var(--color-border-subtle)]/50":
              variant === "ghost",
            "h-8 px-3 text-xs": size === "sm",
            "h-10 px-4 py-2": size === "md",
            "h-12 px-8 text-lg": size === "lg",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
