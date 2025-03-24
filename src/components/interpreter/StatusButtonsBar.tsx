
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
  const toastRef = useRef<{ id: string; dismiss: () => void } | null>(null);
  const errorCountRef = useRef(0);
  const lastSuccessfulUpdateRef = useRef<number>(Date.now());

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
      
      // Dismiss any active toast
      if (toastRef.current) {
        toastRef.current.dismiss();
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
      
      // Reset error count when status is successfully updated from props
      errorCountRef.current = 0;
      lastSuccessfulUpdateRef.current = Date.now();
      
      // Clear any active error toast 
      if (toastRef.current) {
        toastRef.current.dismiss();
        toastRef.current = null;
      }
      
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
    if (!userId.current || localStatus === newStatus) return;
    
    // Don't allow new updates if too many errors in short period
    const timeSinceLastSuccess = Date.now() - lastSuccessfulUpdateRef.current;
    if (errorCountRef.current >= 3 && timeSinceLastSuccess < 60000) {
      console.log('[StatusButtonsBar] Too many errors recently, blocking new updates temporarily');
      
      // Show rate limit toast instead of repeated error
      if (!toastRef.current) {
        toastRef.current = toast({
          title: "Trop de tentatives",
          description: "Veuillez attendre quelques instants avant de réessayer.",
          variant: "destructive",
          duration: 5000,
        });
      }
      return;
    }
    
    // If already updating, queue this change
    if (isUpdating) {
      console.log('[StatusButtonsBar] Update already in progress, queueing:', newStatus);
      updateQueueRef.current = newStatus;
      return;
    }
    
    try {
      setIsUpdating(true);
      console.log('[StatusButtonsBar] Changing status to:', newStatus);
      
      // Dismiss any previous error toast
      if (toastRef.current) {
        toastRef.current.dismiss();
        toastRef.current = null;
      }
      
      // Optimistically update local state
      setLocalStatus(newStatus);
      
      // Update status directly in database as the primary method
      const { data, error: dbError } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: userId.current,
        p_status: newStatus as string
      });
      
      if (dbError) {
        console.error('[StatusButtonsBar] Database error:', dbError);
        throw dbError;
      }

      // Call the parent handler after successful database update
      if (onStatusChange) {
        await onStatusChange(newStatus);
      }
      
      console.log('[StatusButtonsBar] Status changed to:', newStatus);
      lastSuccessfulUpdateRef.current = Date.now();
      errorCountRef.current = 0;
      
      // Show success toast
      toast({
        title: "Statut mis à jour",
        description: `Votre statut a été changé en "${statusConfig[newStatus].label}"`,
        duration: 3000,
      });
      
      // Dispatch a status update event to synchronize other components
      window.dispatchEvent(new CustomEvent('local-interpreter-status-update', { 
        detail: { interpreterId: userId.current, status: newStatus }
      }));
    } catch (error) {
      console.error('[StatusButtonsBar] Error changing status:', error);
      errorCountRef.current++;
      
      // Revert to previous status on error
      setLocalStatus(currentStatus);
      
      // Show error toast (but don't show repeatedly)
      if (!toastRef.current) {
        toastRef.current = toast({
          title: "Erreur",
          description: "Impossible de mettre à jour votre statut. Veuillez réessayer.",
          variant: "destructive",
          duration: errorCountRef.current >= 3 ? 10000 : 5000,
        });
      }
      
      // Set up retry with exponential backoff if there was an error
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      // Only retry a reasonable number of times with increasing delays
      if (errorCountRef.current < 5) {
        const retryDelay = Math.min(2000 * Math.pow(1.5, errorCountRef.current - 1), 15000);
        
        console.log(`[StatusButtonsBar] Will retry status update in ${retryDelay}ms`);
        
        retryTimeoutRef.current = setTimeout(() => {
          console.log('[StatusButtonsBar] Retrying status update to:', newStatus);
          retryTimeoutRef.current = null;
          // Queue the retry
          updateQueueRef.current = newStatus;
          processQueuedUpdate();
        }, retryDelay);
      } else {
        console.log('[StatusButtonsBar] Maximum retry attempts reached');
      }
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
              isUpdating && !isActive ? "opacity-70 cursor-not-allowed" : "",
              // Disable buttons if we've had too many errors recently
              errorCountRef.current >= 3 && Date.now() - lastSuccessfulUpdateRef.current < 60000 
                ? "opacity-50 cursor-not-allowed" : ""
            )}
            onClick={() => handleStatusChange(statusKey)}
            whileTap={{ scale: 0.95 }}
            animate={isActive ? { scale: [1, 1.03, 1] } : {}}
            transition={{ duration: 0.2 }}
            disabled={isUpdating || (errorCountRef.current >= 3 && Date.now() - lastSuccessfulUpdateRef.current < 60000)}
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
