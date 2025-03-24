
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Clock, Coffee, X, Phone } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";

type Status = "available" | "unavailable" | "pause" | "busy";

interface StatusManagerProps {
  currentStatus?: Status;
  onStatusChange?: (newStatus: Status) => Promise<void>;
}

export const StatusManager = ({ currentStatus, onStatusChange }: StatusManagerProps = {}) => {
  const [status, setStatus] = useState<Status>(currentStatus || "available");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isProcessingRef = useRef(false);
  const lastStatusUpdateRef = useRef<string | null>(null);

  // Update local state when prop changes
  useEffect(() => {
    if (currentStatus && currentStatus !== status && isValidStatus(currentStatus)) {
      console.log('[StatusManager] Current status updated from prop:', currentStatus);
      setStatus(currentStatus);
    }
  }, [currentStatus, status]);

  // Get current user ID and set up real-time subscription
  useEffect(() => {
    const getCurrentUserId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('[StatusManager] No authenticated user found');
          return;
        }

        setUserId(user.id);
      } catch (error) {
        console.error('[StatusManager] Error getting user:', error);
      }
    };

    getCurrentUserId();
    
    // Listen for status update events
    const handleStatusUpdate = (event: CustomEvent<{interpreter_id: string, status: Status, timestamp?: number}>) => {
      const detail = event.detail;
      if (!detail || !detail.interpreter_id || !detail.status) return;
      
      // Skip if user ID doesn't match
      if (userId && detail.interpreter_id !== userId) return;
      
      console.log('[StatusManager] Received status update event:', detail);
      
      // Skip if the status hasn't changed
      if (detail.status === status || !isValidStatus(detail.status)) return;
      
      // Create a unique update identifier
      const updateId = `${detail.status}-${detail.timestamp || Date.now()}`;
      
      // Skip if this is a duplicate of our last update
      if (updateId === lastStatusUpdateRef.current) {
        console.log('[StatusManager] Skipping duplicate event:', updateId);
        return;
      }
      
      console.log('[StatusManager] Updating status to', detail.status);
      lastStatusUpdateRef.current = updateId;
      setStatus(detail.status);
    };
    
    window.addEventListener('interpreter-status-update', handleStatusUpdate as EventListener);
    
    return () => {
      window.removeEventListener('interpreter-status-update', handleStatusUpdate as EventListener);
    };
  }, [status, userId]);

  // Set up realtime subscription for status updates
  useRealtimeSubscription(
    {
      event: 'UPDATE',
      table: 'interpreter_profiles',
      filter: userId ? `id=eq.${userId}` : undefined
    },
    (payload) => {
      if (!payload.new || !payload.new.status) return;
      
      console.log('[StatusManager] Status update received:', payload);
      const newStatus = payload.new.status;
      
      if (isValidStatus(newStatus) && newStatus !== status) {
        // Create a unique update identifier
        const updateId = `${newStatus}-${Date.now()}`;
        
        // Skip if this is a duplicate of our last update
        if (updateId === lastStatusUpdateRef.current) {
          console.log('[StatusManager] Skipping duplicate update:', updateId);
          return;
        }
        
        console.log('[StatusManager] Updating status to', newStatus);
        lastStatusUpdateRef.current = updateId;
        setStatus(newStatus);
      }
    },
    {
      enabled: !!userId,
      onError: (error) => {
        console.error('[StatusManager] Error in realtime subscription:', error);
      },
      debugMode: true
    }
  );

  const isValidStatus = (status: string): status is Status => {
    return ['available', 'unavailable', 'pause', 'busy'].includes(status);
  };

  const statusConfig = {
    available: {
      color: "bg-interpreter-available hover:bg-interpreter-available/90",
      label: "Disponible",
      icon: Clock,
      mobileLabel: "Dispo"
    },
    busy: {
      color: "bg-interpreter-busy hover:bg-interpreter-busy/90",
      label: "En appel",
      icon: Phone,
      mobileLabel: "Appel"
    },
    pause: {
      color: "bg-interpreter-pause hover:bg-interpreter-pause/90",
      label: "En pause",
      icon: Coffee,
      mobileLabel: "Pause"
    },
    unavailable: {
      color: "bg-interpreter-unavailable hover:bg-interpreter-unavailable/90",
      label: "Indisponible",
      icon: X,
      mobileLabel: "Indispo"
    }
  };

  const handleStatusChange = async (newStatus: Status) => {
    if (status === newStatus || !userId || isLoading || isProcessingRef.current) return;
    
    // Set processing flag to prevent concurrent updates
    isProcessingRef.current = true;
    setIsLoading(true);
    
    try {
      console.log('[StatusManager] Attempting status update for user:', userId);
      
      // Optimistically update local state
      setStatus(newStatus);
      
      // First try direct database update for reliability
      const { error: dbError } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: userId,
        p_status: newStatus
      });

      if (dbError) {
        console.error('[StatusManager] Database error:', dbError);
        throw dbError;
      }

      console.log('[StatusManager] Status update successful');
      
      // Dispatch an event that other components can listen to
      window.dispatchEvent(new CustomEvent('interpreter-status-update', { 
        detail: { 
          interpreter_id: userId,
          status: newStatus,
          timestamp: Date.now()
        }
      }));

      // Call the parent handler if provided
      if (onStatusChange) {
        try {
          await onStatusChange(newStatus);
        } catch (handlerError) {
          console.error('[StatusManager] Error in parent handler:', handlerError);
          // We already updated the DB directly, so continue
        }
      }

      toast({
        title: "Statut mis à jour",
        description: `Votre statut est maintenant "${statusConfig[newStatus].label}"`,
      });
    } catch (error: any) {
      console.error('[StatusManager] Error updating status:', error);
      
      // Revert on error
      setStatus(currentStatus || 'available');
      
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour votre statut",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      
      // Release the processing lock after a short delay to prevent rapid clicks
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 300);
    }
  };

  return (
    <motion.div 
      className="flex flex-wrap items-center gap-2 mx-auto w-full max-w-screen-sm"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {(Object.keys(statusConfig) as Status[]).map((statusKey) => {
        const Icon = statusConfig[statusKey].icon;
        return (
          <motion.div
            key={statusKey}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 min-w-0"
          >
            <Button
              variant={status === statusKey ? "default" : "outline"}
              size="default"
              onClick={() => handleStatusChange(statusKey)}
              disabled={isLoading || isProcessingRef.current}
              className={`
                w-full transition-all duration-200
                h-12 text-xs sm:text-sm font-medium px-1 sm:px-3
                ${status === statusKey ? statusConfig[statusKey].color : ''}
                ${status === statusKey ? 'shadow-lg' : ''}
                ${status !== statusKey ? 'bg-white dark:bg-gray-950' : ''}
              `}
            >
              <Icon className="h-3 w-3 sm:h-4 sm:w-4 min-w-3 sm:min-w-4 mr-0.5 sm:mr-1 flex-shrink-0" />
              <span className="truncate whitespace-nowrap">
                {isMobile ? statusConfig[statusKey].mobileLabel : statusConfig[statusKey].label}
              </span>
            </Button>
          </motion.div>
        );
      })}
    </motion.div>
  );
};
