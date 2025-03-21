
import * as React from "react"
import { cn } from "@/lib/utils"
import { motion, HTMLMotionProps } from "framer-motion"

// Create a more specific type for motionProps to avoid conflicts
type MotionDivProps = Omit<HTMLMotionProps<"div">, "className" | "children">;

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  asMotion?: boolean;
  motionProps?: MotionDivProps;
}

const Card = React.forwardRef<
  HTMLDivElement,
  CardProps
>(({ className, asMotion = false, motionProps, ...props }, ref) => {
  if (asMotion) {
    return (
      <motion.div
        // Cast the ref to any to bypass the TypeScript checking
        ref={ref as React.Ref<HTMLDivElement>}
        className={cn(
          "rounded-xl border bg-white/80 dark:bg-gray-800/80 text-card-foreground shadow-md hover:shadow-xl backdrop-blur-sm transition-all duration-300",
          className
        )}
        // Spread motionProps and props separately to avoid type conflicts
        {...(motionProps || {})}
        {...props}
      />
    )
  }
  
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border bg-white/80 dark:bg-gray-800/80 text-card-foreground shadow-md hover:shadow-xl backdrop-blur-sm transition-all duration-300",
        className
      )}
      {...props}
    />
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 p-6 bg-gradient-to-r from-white to-slate-50/80 dark:from-gray-800/90 dark:to-gray-700/80 rounded-t-xl",
      className
    )}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight text-gradient-primary",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
