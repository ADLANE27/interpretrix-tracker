import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Clock, Coffee, X, Phone } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATED } from "@/lib/events";
import { updateInterpreterStatus } from "@/utils/statusUpdates";

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
  const statusUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for status updates from other components
  useEffect(() => {
    const handleStatusUpdate = (data: { interpreterId: string; status: string }) => {
      if (userId && data.interpreterId === userId && data.status !== status) {
        console.log(`[StatusManager] Received status update event for ${userId}:`, data.status);
        setStatus(data.status as Status);
      }
    };

    eventEmitter.on(EVENT_INTERPRETER_STATUS_UPDATED, handleStatusUpdate);
    
    return () => {
      eventEmitter.off(EVENT_INTERPRETER_STATUS_UPDATED, handleStatusUpdate);
    };
  }, [status, userId]);

  // Update local state when prop changes
  useEffect(() => {
    if (currentStatus && currentStatus !== status) {
      console.log('[StatusManager] Current status updated from prop:', currentStatus);
      setStatus(currentStatus);
    }
  }, [currentStatus]);

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
  }, []);

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
      if (isValidStatus(newStatus)) {
        setStatus(newStatus);
      }
    },
    {
      enabled: !!userId,
      onError: (error) => {
        console.error('[StatusManager] Error in realtime subscription:', error);
      }
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
    if (status === newStatus || !userId) return;
    
    setIsLoading(true);
    
    try {
      console.log('[StatusManager] Attempting status update for user:', userId);
      
      // Clear any existing timeout
      if (statusUpdateTimeoutRef.current) {
        clearTimeout(statusUpdateTimeoutRef.current);
      }
      
      const previousStatus = status;
      
      // Optimistically update local state
      setStatus(newStatus);
      
      // Use the centralized status update function
      const result = await updateInterpreterStatus(userId, newStatus, previousStatus);

      if (!result.success) {
        throw result.error || new Error("Failed to update status");
      }

      console.log('[StatusManager] Status update successful');

      if (onStatusChange) {
        await onStatusChange(newStatus);
      }

      toast({
        title: "Statut mis à jour",
        description: `Votre statut est maintenant "${statusConfig[newStatus].label}"`,
      });
    } catch (error: any) {
      console.error('[StatusManager] Error updating status:', error);
      
      // Revert to previous status on error with a slight delay to avoid UI flicker
      statusUpdateTimeoutRef.current = setTimeout(() => {
        setStatus(currentStatus || 'available');
      }, 500);
      
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour votre statut. Veuillez réessayer.",
        variant: "destructive",
      });
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
