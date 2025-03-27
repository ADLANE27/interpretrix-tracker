
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StatusTriggerProps {
  displayFormat: "badge" | "button";
  statusConfig: {
    label: string;
    color: string;
    icon: React.ElementType;
  };
  status: string;
  className?: string;
  disabled?: boolean;
  isConnected?: boolean;
  onClick?: () => void;
}

export const StatusTrigger: React.FC<StatusTriggerProps> = ({
  displayFormat,
  statusConfig,
  status,
  className = "",
  disabled = false,
  isConnected = true,
  onClick
}) => {
  const Icon = statusConfig.icon;

  const badgeClasses = cn(
    "bg-opacity-90 hover:bg-opacity-100 transition-all font-medium flex items-center gap-1",
    statusConfig.color,
    !isConnected ? "opacity-60" : "",
    className
  );

  const buttonClasses = cn(
    "font-medium flex items-center gap-1.5 shadow-sm",
    statusConfig.color,
    !isConnected ? "opacity-60" : "",
    className
  );

  if (displayFormat === "badge") {
    return (
      <motion.div
        initial={{ scale: 1 }}
        whileHover={{ scale: 1.03 }}
        className="relative"
      >
        <Badge 
          className={badgeClasses}
          onClick={onClick}
          style={{
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          <Icon className="h-3 w-3" />
          <span>{statusConfig.label}</span>
        </Badge>
        
        <style jsx global>{`
          @keyframes pulse-badge {
            0% {
              box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.2);
            }
            70% {
              box-shadow: 0 0 0 6px rgba(0, 0, 0, 0);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
            }
          }
          
          .pulse-animation {
            animation: pulse-badge 1s ease-out;
            animation-iteration-count: 2;
          }
        `}</style>
      </motion.div>
    );
  }

  return (
    <Button
      variant="default"
      size="sm"
      className={buttonClasses}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
      <span>{statusConfig.label}</span>
    </Button>
  );
};
