
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
  delayMs?: number;
}

export function LoadingSpinner({ 
  size = "md", 
  className, 
  text, 
  delayMs = 150 // Further reduced delay for even faster feedback
}: LoadingSpinnerProps) {
  const [showSpinner, setShowSpinner] = useState(delayMs === 0);
  
  useEffect(() => {
    if (delayMs === 0) return;
    
    const timer = setTimeout(() => {
      setShowSpinner(true);
    }, delayMs);
    
    return () => clearTimeout(timer);
  }, [delayMs]);
  
  if (!showSpinner) return null;
  
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {text && <p className="text-sm text-muted-foreground animate-pulse">{text}</p>}
    </div>
  );
}
