
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
  const toastRef = useRef<{ id: string; dismiss: () => void } | null>(null);
  const errorCountRef = useRef(0);
  const lastSuccessfulUpdateRef = useRef<number>(Date.now());

  // Update local state when prop changes
  useEffect(() => {
    if (currentStatus && currentStatus !== status) {
      console.log('[StatusManager] Current status updated from prop:', currentStatus);
      setStatus(currentStatus);
      
      // Reset error count when status is successfully updated from props
      errorCountRef.current = 0;
      lastSuccessfulUpdateRef.current = Date.now();
      
      // Clear any active error toast
      if (toastRef.current) {
        toastRef.current.dismiss();
        toastRef.current = null;
      }
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
    
    // Listen for local status updates from other components
    const handleLocalStatusUpdate = (event: CustomEvent) => {
      const { interpreterId, status: newStatus } = event.detail;
      if (interpreterId === userId && isValidStatus(newStatus)) {
        console.log('[StatusManager] Received local status update:', newStatus);
        setStatus(newStatus);
      }
    };
    
    window.addEventListener('local-interpreter-status-update', handleLocalStatusUpdate as EventListener);
    
    return () => {
      window.removeEventListener('local-interpreter-status-update', handleLocalStatusUpdate as EventListener);
      
      // Dismiss any active toast
      if (toastRef.current) {
        toastRef.current.dismiss();
      }
    };
  }, [userId]);

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
        
        // Reset error count when status is successfully updated from server
        errorCountRef.current = 0;
        lastSuccessfulUpdateRef.current = Date.now();
        
        // Clear any active error toast
        if (toastRef.current) {
          toastRef.current.dismiss();
          toastRef.current = null;
        }
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
    if (status === newStatus || !userId) return;
    
    // Don't allow new updates if too many errors in short period
    const timeSinceLastSuccess = Date.now() - lastSuccessfulUpdateRef.current;
    if (errorCountRef.current >= 3 && timeSinceLastSuccess < 60000) {
      console.log('[StatusManager] Too many errors recently, blocking new updates temporarily');
      
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
    
    setIsLoading(true);
    
    // Dismiss any previous error toast
    if (toastRef.current) {
      toastRef.current.dismiss();
      toastRef.current = null;
    }
    
    try {
      console.log('[StatusManager] Attempting status update for user:', userId);
      
      // Optimistically update local state
      setStatus(newStatus);
      
      const { error } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: userId,
        p_status: newStatus as string
      });

      if (error) {
        console.error('[StatusManager] Database error:', error);
        // Revert on error
        setStatus(status);
        throw error;
      }

      console.log('[StatusManager] Status update successful');
      lastSuccessfulUpdateRef.current = Date.now();
      errorCountRef.current = 0;

      if (onStatusChange) {
        await onStatusChange(newStatus);
      }

      toast({
        title: "Statut mis à jour",
        description: `Votre statut est maintenant "${statusConfig[newStatus].label}"`,
        duration: 3000,
      });
      
      // Dispatch a status update event to synchronize other components
      window.dispatchEvent(new CustomEvent('local-interpreter-status-update', { 
        detail: { interpreterId: userId, status: newStatus }
      }));
    } catch (error: any) {
      console.error('[StatusManager] Error updating status:', error);
      errorCountRef.current++;
      
      // Show error toast (but don't show repeatedly)
      if (!toastRef.current) {
        toastRef.current = toast({
          title: "Erreur",
          description: "Impossible de mettre à jour votre statut",
          variant: "destructive",
          duration: errorCountRef.current >= 3 ? 10000 : 5000,
        });
      }
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
        const isButtonDisabled = isLoading || 
          (errorCountRef.current >= 3 && Date.now() - lastSuccessfulUpdateRef.current < 60000);
          
        return (
          <motion.div
            key={statusKey}
            whileHover={{ scale: isButtonDisabled ? 1 : 1.02 }}
            whileTap={{ scale: isButtonDisabled ? 1 : 0.98 }}
            className="flex-1 min-w-0"
          >
            <Button
              variant={status === statusKey ? "default" : "outline"}
              size="default"
              onClick={() => handleStatusChange(statusKey)}
              disabled={isButtonDisabled}
              className={`
                w-full transition-all duration-200
                h-12 text-xs sm:text-sm font-medium px-1 sm:px-3
                ${status === statusKey ? statusConfig[statusKey].color : ''}
                ${status === statusKey ? 'shadow-lg' : ''}
                ${status !== statusKey ? 'bg-white dark:bg-gray-950' : ''}
                ${isButtonDisabled ? 'opacity-50 cursor-not-allowed' : ''}
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
