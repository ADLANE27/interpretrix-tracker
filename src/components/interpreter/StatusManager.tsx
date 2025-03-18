
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Clock, Coffee, X, Phone } from "lucide-react";

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

  // Update local state when prop changes
  useEffect(() => {
    if (currentStatus && currentStatus !== status) {
      setStatus(currentStatus);
    }
  }, [currentStatus]);

  // Get current user ID and set up real-time subscription
  useEffect(() => {
    const setupSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('[StatusManager] No authenticated user found');
          return;
        }

        setUserId(user.id);

        // Set up real-time subscription only after we have the user ID
        const channel = supabase.channel('interpreter-status')
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'interpreter_profiles',
            filter: `id=eq.${user.id}`
          }, payload => {
            console.log('[StatusManager] Status update received:', payload);
            const newStatus = payload.new.status;
            if (isValidStatus(newStatus)) {
              setStatus(newStatus);
            }
          })
          .subscribe(status => {
            console.log('[StatusManager] Subscription status:', status);
          });

        return () => {
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.error('[StatusManager] Error setting up subscription:', error);
      }
    };

    setupSubscription();
  }, []);

  const isValidStatus = (status: string): status is Status => {
    return ['available', 'unavailable', 'pause', 'busy'].includes(status);
  };

  const statusConfig = {
    available: {
      color: "bg-interpreter-available hover:bg-interpreter-available/90",
      label: "Disponible",
      icon: Clock
    },
    busy: {
      color: "bg-interpreter-busy hover:bg-interpreter-busy/90",
      label: "En appel",
      icon: Phone
    },
    pause: {
      color: "bg-interpreter-pause hover:bg-interpreter-pause/90",
      label: "En pause",
      icon: Coffee
    },
    unavailable: {
      color: "bg-interpreter-unavailable hover:bg-interpreter-unavailable/90",
      label: "Indisponible",
      icon: X
    }
  };

  const handleStatusChange = async (newStatus: Status) => {
    if (status === newStatus || !userId) return;
    
    setIsLoading(true);
    try {
      console.log('[StatusManager] Attempting status update for user:', userId);
      
      const { error } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: userId,
        p_status: newStatus as string
      });

      if (error) {
        console.error('[StatusManager] Database error:', error);
        throw error;
      }

      console.log('[StatusManager] Status update successful');

      if (onStatusChange) {
        await onStatusChange(newStatus);
      }

      setStatus(newStatus);
      toast({
        title: "Statut mis à jour",
        description: `Votre statut est maintenant "${statusConfig[newStatus].label}"`,
      });
    } catch (error: any) {
      console.error('[StatusManager] Error updating status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour votre statut",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      className="flex flex-wrap items-center gap-2 mx-auto w-full max-w-screen-sm px-1 overflow-visible"
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
            className="flex-grow min-w-0"
          >
            <Button
              variant={status === statusKey ? "default" : "outline"}
              size="default"
              onClick={() => handleStatusChange(statusKey)}
              disabled={isLoading}
              className={`
                w-full transition-all duration-200 text-sm font-medium
                h-10 px-1 sm:px-4
                ${status === statusKey ? statusConfig[statusKey].color : ''}
                ${status === statusKey ? 'shadow-lg' : ''}
                ${status !== statusKey ? 'bg-white dark:bg-gray-950' : ''}
              `}
            >
              <Icon className="h-4 w-4 mr-1 sm:mr-1.5 flex-shrink-0" />
              <span className="truncate">{statusConfig[statusKey].label}</span>
            </Button>
          </motion.div>
        );
      })}
    </motion.div>
  );
};
