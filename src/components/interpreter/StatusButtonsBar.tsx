
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const isProcessingRef = useRef(false);

  // Direct database update function - simplified to avoid race conditions
  const updateStatus = useCallback(async (status: Status) => {
    if (!userId.current) return false;
    
    try {
      console.log('[StatusButtonsBar] Directly updating status in database:', status);
      
      // Use the RPC function for reliability
      const { error } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: userId.current,
        p_status: status
      });
      
      if (error) {
        console.error('[StatusButtonsBar] Database error:', error);
        throw error;
      }
      
      // Generate unique transaction ID for this update
      const timestamp = Date.now();
      const transactionId = `${status}-${timestamp}`;
      
      // Dispatch event with transaction ID to prevent duplicate processing
      window.dispatchEvent(new CustomEvent('interpreter-status-update', { 
        detail: { 
          interpreter_id: userId.current,
          status: status,
          timestamp: timestamp
        }
      }));
      
      return true;
    } catch (error) {
      console.error('[StatusButtonsBar] Error updating status:', error);
      throw error;
    }
  }, []);

  // Get user ID once on component mount
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userId.current = user.id;
          console.log('[StatusButtonsBar] User ID set:', user.id);
        }
      } catch (error) {
        console.error('[StatusButtonsBar] Error fetching user ID:', error);
      }
    };
    
    fetchUserId();
    
    // Listen for global status updates
    const handleStatusUpdate = (event: CustomEvent<{interpreter_id: string, status: Status, timestamp?: number}>) => {
      const detail = event.detail;
      if (!detail || !userId.current || detail.interpreter_id !== userId.current) return;
      
      console.log('[StatusButtonsBar] Received status update event:', detail);
      
      // Skip if the status isn't valid or hasn't changed
      if (!detail.status || detail.status === localStatus || !isValidStatus(detail.status)) return;
      
      // Create a unique update identifier
      const updateId = `${detail.status}-${detail.timestamp || Date.now()}`;
      
      // Skip if this is a duplicate of our last update
      if (updateId === lastUpdateRef.current) {
        console.log('[StatusButtonsBar] Skipping duplicate event:', updateId);
        return;
      }
      
      console.log('[StatusButtonsBar] Updating local status to', detail.status);
      lastUpdateRef.current = updateId;
      setLocalStatus(detail.status);
      
      // Reset circuit breaker on successful update
      if (isCircuitBrokenRef.current) {
        isCircuitBrokenRef.current = false;
        failedAttemptsRef.current = 0;
        
        if (circuitBreakerTimeoutRef.current) {
          clearTimeout(circuitBreakerTimeoutRef.current);
          circuitBreakerTimeoutRef.current = null;
        }
      }
    };
    
    window.addEventListener('interpreter-status-update', handleStatusUpdate as EventListener);
    
    return () => {
      window.removeEventListener('interpreter-status-update', handleStatusUpdate as EventListener);
      
      // Clean up any pending timeouts
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
          if (!payload.new) return;
          
          const newStatus = payload.new.status;
          console.log('[StatusButtonsBar] Real-time status update received:', newStatus);
          
          if (!newStatus || !isValidStatus(newStatus) || newStatus === localStatus) return;
          
          // Create a unique update identifier
          const updateId = `${newStatus}-${Date.now()}`;
          
          // Skip if this is a duplicate of our last update
          if (updateId === lastUpdateRef.current) {
            console.log('[StatusButtonsBar] Skipping duplicate update:', updateId);
            return;
          }
          
          console.log('[StatusButtonsBar] Updating local status to', newStatus);
          lastUpdateRef.current = updateId;
          setLocalStatus(newStatus);
          
          // Reset circuit breaker on successful update
          if (isCircuitBrokenRef.current) {
            isCircuitBrokenRef.current = false;
            failedAttemptsRef.current = 0;
            
            if (circuitBreakerTimeoutRef.current) {
              clearTimeout(circuitBreakerTimeoutRef.current);
              circuitBreakerTimeoutRef.current = null;
            }
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [localStatus]);

  // Update local state when prop changes
  useEffect(() => {
    if (currentStatus && currentStatus !== localStatus && isValidStatus(currentStatus)) {
      console.log('[StatusButtonsBar] Current status updated from prop:', currentStatus);
      setLocalStatus(currentStatus);
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

  // Improved status change handler with better error handling
  const handleStatusChange = async (newStatus: Status) => {
    // Skip if same status, no user ID, already updating, or circuit breaker is active
    if (newStatus === localStatus || !userId.current || isUpdating || isCircuitBrokenRef.current || isProcessingRef.current) {
      return;
    }
    
    // Set processing flag to prevent concurrent updates
    isProcessingRef.current = true;
    
    try {
      setIsUpdating(true);
      console.log('[StatusButtonsBar] Changing status to:', newStatus);
      
      // Optimistically update local state
      setLocalStatus(newStatus);
      
      // Try database update first with proper error handling
      const success = await updateStatus(newStatus);
      
      if (!success) {
        throw new Error('Failed to update status in database');
      }
      
      // Then call the parent handler - but don't fail if it fails
      if (onStatusChange) {
        try {
          await onStatusChange(newStatus);
        } catch (handlerError) {
          console.error('[StatusButtonsBar] Error in parent handler:', handlerError);
          // We already updated the DB directly, so continue without failing
        }
      }
      
      // Reset failed attempts on success
      failedAttemptsRef.current = 0;
      
      // Show success toast
      toast({
        title: "Statut mis à jour",
        description: `Votre statut a été changé en "${statusConfig[newStatus].label}"`,
        duration: 3000,
      });
    } catch (error) {
      console.error('[StatusButtonsBar] Error changing status:', error);
      
      failedAttemptsRef.current += 1;
      console.log(`[StatusButtonsBar] Failed attempts: ${failedAttemptsRef.current}/${maxFailedAttempts}`);
      
      // Revert to previous status on error
      setLocalStatus(currentStatus);
      
      // Implement circuit breaker pattern to prevent repeated failures
      if (failedAttemptsRef.current >= maxFailedAttempts) {
        console.log('[StatusButtonsBar] Circuit breaker activated');
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
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour votre statut. Veuillez réessayer.",
          variant: "destructive",
          duration: 3000,
        });
      }
    } finally {
      setIsUpdating(false);
      
      // Release the processing lock after a short delay to prevent rapid clicks
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 300);
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
            onClick={() => handleStatusChange(statusKey)}
            whileTap={{ scale: 0.95 }}
            animate={isActive ? { scale: [1, 1.03, 1] } : {}}
            transition={{ duration: 0.2 }}
            disabled={isUpdating || isCircuitBrokenRef.current || isProcessingRef.current}
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
