
import * as React from "react"
import { cn } from "@/lib/utils"
import { motion, HTMLMotionProps, AnimationDefinition } from "framer-motion"

// Create a specialized type for our Card component when used with motion
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  asMotion?: boolean;
  motionProps?: Omit<HTMLMotionProps<"div">, "className" | "children">;
}

const Card = React.forwardRef<
  HTMLDivElement,
  CardProps
>(({ className, asMotion = false, motionProps, ...props }, ref) => {
  if (asMotion) {
    // For TypeScript's benefit, we're not actually extracting these props from the props object
    // We're just telling TypeScript that we know what we're doing and these props won't be passed to motion.div
    const { 
      onDrag, onDragStart, onDragEnd,
      // These are React animation event handlers, not Framer Motion ones
      onAnimationStart, onAnimationComplete, onAnimationEnd, onAnimationIteration,
      ...restProps 
    } = props as any; // Use type assertion to satisfy TypeScript
    
    // Cast the ref to avoid TypeScript errors with framer-motion
    return (
      <motion.div
        ref={ref as any}
        className={cn(
          "rounded-xl border bg-white/80 dark:bg-gray-800/80 text-card-foreground shadow-md hover:shadow-xl backdrop-blur-sm transition-all duration-300",
          className
        )}
        // Only apply compatible props 
        {...restProps}
        // Apply motion-specific props, which will correctly handle all event handlers
        {...(motionProps || {})}
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
