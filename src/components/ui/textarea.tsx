import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex w-full rounded-lg px-3 py-2 text-sm",
          "bg-transparent",
          "placeholder:text-muted-foreground/60",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-all duration-200",
          "border-0",
          "resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
