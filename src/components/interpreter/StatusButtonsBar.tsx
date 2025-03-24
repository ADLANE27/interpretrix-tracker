
import React, { useState, useEffect, useRef } from 'react';
import { Clock, Coffee, X, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";

type Status = "available" | "unavailable" | "pause" | "busy";

interface StatusButtonsBarProps {
  currentStatus?: Status;
  onStatusChange?: (newStatus: Status) => Promise<void>;
  variant?: 'default' | 'compact';
}

export const StatusButtonsBar: React.FC<StatusButtonsBarProps> = ({ 
  currentStatus = 'available', 
  onStatusChange,
  variant = 'default'
}) => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [localStatus, setLocalStatus] = useState<Status>(currentStatus);
  const lastUpdateRef = useRef<string | null>(null);
  const userId = useRef<string | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateQueueRef = useRef<Status | null>(null);

  // Get user ID once on component mount
  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId.current = user.id;
      }
    };
    
    fetchUserId();
    
    return () => {
      // Clear any pending retries on unmount
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Update local state when prop changes
  useEffect(() => {
    if (currentStatus && currentStatus !== localStatus) {
      const updateId = `${currentStatus}-${Date.now()}`;
      
      // Prevent duplicate updates
      if (updateId === lastUpdateRef.current) return;
      lastUpdateRef.current = updateId;
      
      console.log('[StatusButtonsBar] Current status updated from prop:', currentStatus);
      setLocalStatus(currentStatus);
      
      // Clear any queued updates that match the new status
      if (updateQueueRef.current === currentStatus) {
        updateQueueRef.current = null;
      }
    }
  }, [currentStatus, localStatus]);

  const statusConfig = {
    available: {
      color: "from-green-400 to-green-600",
      shadowColor: "shadow-green-500/20",
      label: "Disponible",
      mobileLabel: "Dispo",
      icon: Clock
    },
    busy: {
      color: "from-violet-400 to-violet-600",
      shadowColor: "shadow-violet-500/20",
      label: "En appel",
      mobileLabel: "Appel",
      icon: Phone
    },
    pause: {
      color: "from-orange-400 to-orange-600",
      shadowColor: "shadow-orange-500/20",
      label: "En pause",
      mobileLabel: "Pause",
      icon: Coffee
    },
    unavailable: {
      color: "from-red-400 to-red-600",
      shadowColor: "shadow-red-500/20",
      label: "Indisponible",
      mobileLabel: "Indispo",
      icon: X
    }
  };

  // Process any queued status updates
  const processQueuedUpdate = async () => {
    if (updateQueueRef.current && !isUpdating) {
      const nextStatus = updateQueueRef.current;
      updateQueueRef.current = null;
      await handleStatusChange(nextStatus);
    }
  };

  const handleStatusChange = async (newStatus: Status) => {
    if (!onStatusChange || localStatus === newStatus) return;
    
    // If already updating, queue this change
    if (isUpdating) {
      console.log('[StatusButtonsBar] Update already in progress, queueing:', newStatus);
      updateQueueRef.current = newStatus;
      return;
    }
    
    try {
      setIsUpdating(true);
      console.log('[StatusButtonsBar] Changing status to:', newStatus);
      
      // Optimistically update local state
      setLocalStatus(newStatus);
      
      // Update status directly in database as the primary method
      if (userId.current) {
        const { error: dbError } = await supabase.rpc('update_interpreter_status', {
          p_interpreter_id: userId.current,
          p_status: newStatus as string
        });
        
        if (dbError) {
          console.error('[StatusButtonsBar] Database error:', dbError);
          throw dbError;
        }

        // Call the parent handler after successful database update
        await onStatusChange(newStatus);
        console.log('[StatusButtonsBar] Status changed to:', newStatus);
        
        // Show success toast
        toast({
          title: "Statut mis à jour",
          description: `Votre statut a été changé en "${statusConfig[newStatus].label}"`,
        });
      } else {
        throw new Error("User ID not available");
      }
    } catch (error) {
      console.error('[StatusButtonsBar] Error changing status:', error);
      
      // Revert to previous status on error
      setLocalStatus(currentStatus);
      
      // Show error toast
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour votre statut. Veuillez réessayer.",
        variant: "destructive",
      });
      
      // Set up retry if there was an error
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      retryTimeoutRef.current = setTimeout(() => {
        console.log('[StatusButtonsBar] Retrying status update to:', newStatus);
        retryTimeoutRef.current = null;
        // Queue the retry
        updateQueueRef.current = newStatus;
        processQueuedUpdate();
      }, 3000);
    } finally {
      setIsUpdating(false);
      
      // Process any queued updates
      setTimeout(processQueuedUpdate, 100);
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-2 mx-auto w-full max-w-screen-sm overflow-x-auto hide-scrollbar py-1",
      variant === 'compact' ? 'px-1' : 'px-4'
    )}>
      {(Object.keys(statusConfig) as Status[]).map((statusKey) => {
        const config = statusConfig[statusKey];
        const Icon = config.icon;
        const isActive = localStatus === statusKey;
        
        return (
          <motion.button
            key={statusKey}
            className={cn(
              "flex items-center gap-1.5 rounded-full transition-all duration-200",
              "py-2 flex-1 justify-center",
              variant === 'compact' ? "px-2 min-w-12" : "px-3 min-w-20",
              isActive 
                ? `bg-gradient-to-r ${config.color} text-white ${config.shadowColor} shadow-lg` 
                : "bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300",
              "backdrop-blur-sm",
              (isUpdating && isActive) ? "opacity-70 cursor-wait" : "",
              isUpdating && !isActive ? "opacity-70 cursor-not-allowed" : ""
            )}
            onClick={() => handleStatusChange(statusKey)}
            whileTap={{ scale: 0.95 }}
            animate={isActive ? { scale: [1, 1.03, 1] } : {}}
            transition={{ duration: 0.2 }}
            disabled={isUpdating}
          >
            <Icon className={cn(
              "flex-shrink-0",
              variant === 'compact' || isMobile ? "h-3.5 w-3.5" : "h-4 w-4"
            )} />
            <span className={cn(
              "font-medium truncate",
              variant === 'compact' || isMobile ? "text-xs" : "text-sm"
            )}>
              {(variant === 'compact' || isMobile) ? config.mobileLabel : config.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};
