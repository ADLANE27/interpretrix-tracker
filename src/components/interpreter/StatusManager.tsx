
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Clock, Coffee, X, Phone } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import { eventEmitter, EVENT_STATUS_UPDATE } from "@/lib/events";

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
  const lastUpdateRef = useRef<{ id: string, timestamp: number } | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Update local state when prop changes with de-duplication
  useEffect(() => {
    if (currentStatus && currentStatus !== status) {
      const now = Date.now();
      const updateId = `${currentStatus}-${now}`;
      
      // Prevent duplicate rapid updates (within 500ms)
      if (lastUpdateRef.current && 
          now - lastUpdateRef.current.timestamp < 500 &&
          lastUpdateRef.current.id.startsWith(currentStatus)) {
        console.log('[StatusManager] Ignoring duplicate update:', currentStatus);
        return;
      }
      
      lastUpdateRef.current = { id: updateId, timestamp: now };
      console.log('[StatusManager] Current status updated from prop:', currentStatus);
      setStatus(currentStatus);
    }
  }, [currentStatus, status]);

  // Get current user ID and subscribe to external status updates
  useEffect(() => {
    const getCurrentUserId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('[StatusManager] No authenticated user found');
          return;
        }

        setUserId(user.id);
        
        // Listen for status updates from elsewhere in the app
        const handleExternalStatusUpdate = (data: { status: Status, userId: string }) => {
          if (data.userId === user.id && data.status !== status) {
            console.log('[StatusManager] Received external status update:', data.status);
            setStatus(data.status);
          }
        };
        
        eventEmitter.on(EVENT_STATUS_UPDATE, handleExternalStatusUpdate);
        
        return () => {
          eventEmitter.off(EVENT_STATUS_UPDATE, handleExternalStatusUpdate);
        };
      } catch (error) {
        console.error('[StatusManager] Error getting user:', error);
      }
    };

    getCurrentUserId();
  }, [status]);

  // Set up realtime subscription for status updates
  useRealtimeSubscription(
    {
      event: 'UPDATE',
      table: 'interpreter_profiles',
      filter: userId ? `id=eq.${userId}` : undefined
    },
    (payload) => {
      console.log('[StatusManager] Status update received:', payload);
      const newStatus = payload.new.status;
      if (isValidStatus(newStatus) && newStatus !== status) {
        const now = Date.now();
        const updateId = `${newStatus}-${now}-realtime`;
        
        // Prevent duplicate rapid updates
        if (lastUpdateRef.current && 
            now - lastUpdateRef.current.timestamp < 500 &&
            lastUpdateRef.current.id.includes(newStatus)) {
          console.log('[StatusManager] Ignoring duplicate realtime update');
          return;
        }
        
        lastUpdateRef.current = { id: updateId, timestamp: now };
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

  const updateStatusInDatabase = async (newStatus: Status): Promise<boolean> => {
    if (!userId) {
      console.error('[StatusManager] No user ID available');
      return false;
    }
    
    try {
      console.log('[StatusManager] Updating status in database:', newStatus);
      const { error } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: userId,
        p_status: newStatus as string
      });

      if (error) {
        console.error('[StatusManager] Database error:', error);
        return false;
      }
      
      console.log('[StatusManager] Database update successful');
      return true;
    } catch (error) {
      console.error('[StatusManager] Database update error:', error);
      return false;
    }
  };

  const handleStatusChange = async (newStatus: Status) => {
    if (status === newStatus || !userId) return;
    
    retryCountRef.current = 0;
    setIsLoading(true);
    
    try {
      console.log('[StatusManager] Attempting status update for user:', userId);
      
      // Optimistically update local state
      setStatus(newStatus);
      
      // Broadcast the status change to other components
      eventEmitter.emit(EVENT_STATUS_UPDATE, { 
        status: newStatus, 
        userId 
      });
      
      // Update status in database
      const dbUpdateSuccess = await updateStatusInDatabase(newStatus);
      
      if (!dbUpdateSuccess) {
        throw new Error('Failed to update status in database');
      }

      if (onStatusChange) {
        await onStatusChange(newStatus);
      }

      toast({
        title: "Statut mis à jour",
        description: `Votre statut est maintenant "${statusConfig[newStatus].label}"`,
      });
    } catch (error: any) {
      console.error('[StatusManager] Error updating status:', error);
      
      // Implement retry logic for failed updates
      const attemptRetry = async () => {
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          console.log(`[StatusManager] Retrying status update (${retryCountRef.current}/${maxRetries})`);
          
          try {
            const dbUpdateSuccess = await updateStatusInDatabase(newStatus);
            
            if (dbUpdateSuccess) {
              console.log('[StatusManager] Retry successful');
              
              // No need to revert the optimistic update if retry succeeds
              toast({
                title: "Statut mis à jour",
                description: `Votre statut est maintenant "${statusConfig[newStatus].label}"`,
              });
              
              return;
            }
          } catch (retryError) {
            console.error('[StatusManager] Retry failed:', retryError);
          }
          
          // Schedule another retry with exponential backoff
          setTimeout(attemptRetry, 1000 * Math.pow(2, retryCountRef.current));
        } else {
          console.error('[StatusManager] Max retries exceeded, reverting to previous status');
          
          // Revert to previous status on error after max retries
          setStatus(currentStatus || 'available');
          
          toast({
            title: "Erreur",
            description: "Impossible de mettre à jour votre statut",
            variant: "destructive",
          });
        }
      };
      
      // Start retry process
      attemptRetry();
    } finally {
      setIsLoading(false);
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
              disabled={isLoading}
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
