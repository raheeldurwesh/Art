import * as React from "react"
import { cn } from "@/lib/utils"

const Badge = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'secondary' | 'destructive' | 'outline' }>(
  ({ className, variant = "default", ...props }, ref) => {
    const variantStyles = {
      default: "bg-primary/10 text-primary border-transparent",
      secondary: "bg-secondary text-secondary-foreground border-transparent",
      destructive: "bg-destructive/10 text-destructive border-transparent",
      outline: "text-foreground border-border",
    }
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors",
          variantStyles[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge }
