
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
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const failedAttemptsRef = useRef(0);
  const maxFailedAttempts = 3;
  const circuitBreakerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCircuitBrokenRef = useRef(false);

  // Get user ID once on component mount
  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId.current = user.id;
        console.log('[StatusButtonsBar] User ID set:', user.id);
      }
    };
    
    fetchUserId();
    
    // Listen for global status updates
    const handleStatusUpdate = (event: CustomEvent) => {
      const detail = event.detail;
      if (detail && detail.interpreter_id === userId.current) {
        console.log('[StatusButtonsBar] Received status update event:', detail.status);
        
        // Only update if the new status is different from local state
        if (detail.status && detail.status !== localStatus) {
          setLocalStatus(detail.status as Status);
        }
      }
    };
    
    window.addEventListener('interpreter-status-update' as any, handleStatusUpdate as EventListener);
    
    return () => {
      window.removeEventListener('interpreter-status-update' as any, handleStatusUpdate as EventListener);
      
      // Clear any pending timeouts
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      if (circuitBreakerTimeoutRef.current) {
        clearTimeout(circuitBreakerTimeoutRef.current);
      }
    };
  }, [localStatus]);

  // Listen for real-time status updates from the database
  useEffect(() => {
    if (!userId.current) return;
    
    console.log('[StatusButtonsBar] Setting up real-time status subscription');
    
    const channel = supabase.channel('interpreter-status-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'interpreter_profiles',
          filter: `id=eq.${userId.current}`
        },
        (payload) => {
          const newStatus = payload.new?.status;
          console.log('[StatusButtonsBar] Real-time status update:', newStatus);
          
          if (newStatus && isValidStatus(newStatus) && newStatus !== localStatus) {
            // Create a unique update ID
            const updateId = `${newStatus}-${Date.now()}`;
            
            // Prevent duplicate updates
            if (updateId === lastUpdateRef.current) return;
            lastUpdateRef.current = updateId;
            
            setLocalStatus(newStatus as Status);
          }
        }
      )
      .subscribe((status) => {
        console.log('[StatusButtonsBar] Real-time subscription status:', status);
      });
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [localStatus]);

  // Update local state when prop changes
  useEffect(() => {
    if (currentStatus && currentStatus !== localStatus) {
      const updateId = `${currentStatus}-${Date.now()}`;
      
      // Prevent duplicate updates
      if (updateId === lastUpdateRef.current) return;
      lastUpdateRef.current = updateId;
      
      console.log('[StatusButtonsBar] Current status updated from prop:', currentStatus);
      setLocalStatus(currentStatus);
      
      // Reset circuit breaker on prop update
      if (isCircuitBrokenRef.current) {
        console.log('[StatusButtonsBar] Resetting circuit breaker on prop update');
        isCircuitBrokenRef.current = false;
        failedAttemptsRef.current = 0;
      }
    }
  }, [currentStatus, localStatus]);

  const isValidStatus = (status: string): status is Status => {
    return ['available', 'unavailable', 'pause', 'busy'].includes(status);
  };

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

  // Debounced status update function
  const updateStatusWithDebounce = (newStatus: Status) => {
    // Clear any pending timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    // Create a new timeout
    updateTimeoutRef.current = setTimeout(() => {
      handleStatusChange(newStatus);
    }, 100); // Short debounce to prevent rapid clicks
  };

  const handleStatusChange = async (newStatus: Status) => {
    if (!onStatusChange || localStatus === newStatus || isUpdating || !userId.current || isCircuitBrokenRef.current) return;
    
    try {
      setIsUpdating(true);
      console.log('[StatusButtonsBar] Changing status to:', newStatus);
      
      // Optimistically update local state
      setLocalStatus(newStatus);
      
      // First attempt direct DB update as a fallback mechanism
      const { error: dbError } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: userId.current,
        p_status: newStatus as string
      });
      
      if (dbError) {
        console.error('[StatusButtonsBar] Database RPC error:', dbError);
        // Don't throw here, still try the parent handler
      }
      
      // Call the parent handler (which might also update the DB)
      try {
        await onStatusChange(newStatus);
        console.log('[StatusButtonsBar] Status changed to:', newStatus);
        
        // Show success toast
        toast({
          title: "Statut mis à jour",
          description: `Votre statut a été changé en "${statusConfig[newStatus].label}"`,
          duration: 3000, // Shorter duration
        });
        
        // Reset failed attempts on success
        failedAttemptsRef.current = 0;
        
        // Trigger an event for other components to update
        window.dispatchEvent(new CustomEvent('interpreter-status-update', { 
          detail: { 
            interpreter_id: userId.current,
            status: newStatus
          }
        }));
      } catch (handlerError) {
        console.error('[StatusButtonsBar] Error in parent handler:', handlerError);
        throw handlerError; // Forward the error to be caught in the catch block
      }
    } catch (error) {
      console.error('[StatusButtonsBar] Error changing status:', error);
      
      failedAttemptsRef.current += 1;
      console.log(`[StatusButtonsBar] Failed attempts: ${failedAttemptsRef.current}/${maxFailedAttempts}`);
      
      // Implement circuit breaker pattern
      if (failedAttemptsRef.current >= maxFailedAttempts) {
        console.log('[StatusButtonsBar] Circuit breaker activated - temporarily disabling status updates');
        isCircuitBrokenRef.current = true;
        
        // Reset circuit breaker after 30 seconds
        circuitBreakerTimeoutRef.current = setTimeout(() => {
          console.log('[StatusButtonsBar] Circuit breaker reset');
          isCircuitBrokenRef.current = false;
          failedAttemptsRef.current = 0;
        }, 30000);
        
        toast({
          title: "Erreur de connexion",
          description: "Trop d'erreurs de mise à jour. Réessayez dans 30 secondes.",
          variant: "destructive",
          duration: 5000,
        });
      } else {
        // Revert to previous status on error
        setLocalStatus(currentStatus);
        
        // Show error toast with increasing duration to avoid toast spam
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour votre statut. Veuillez réessayer.",
          variant: "destructive",
          duration: 3000 + (failedAttemptsRef.current * 1000), // Increasing duration
        });
      }
    } finally {
      setIsUpdating(false);
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
              isUpdating ? "opacity-70 cursor-not-allowed" : "",
              isCircuitBrokenRef.current ? "opacity-50 cursor-not-allowed" : ""
            )}
            onClick={() => updateStatusWithDebounce(statusKey)}
            whileTap={{ scale: 0.95 }}
            animate={isActive ? { scale: [1, 1.03, 1] } : {}}
            transition={{ duration: 0.2 }}
            disabled={isUpdating || isCircuitBrokenRef.current}
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
