import React, { useState, useEffect } from 'react';
import { Clock, Coffee, X, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE } from '@/lib/events';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription2';

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
  const [userId, setUserId] = useState<string | null>(null);

  // Get user ID once on component mount
  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    
    fetchUserId();
  }, []);

  // Update local state when prop changes
  useEffect(() => {
    if (currentStatus && currentStatus !== localStatus) {
      console.log('[StatusButtonsBar] Current status updated from prop:', currentStatus);
      setLocalStatus(currentStatus);
    }
  }, [currentStatus, localStatus]);

  // Set up realtime subscription for status updates
  useRealtimeSubscription(
    {
      event: 'UPDATE',
      table: 'interpreter_profiles',
      filter: userId ? `id=eq.${userId}` : undefined
    },
    (payload) => {
      console.log('[StatusButtonsBar] Status update received:', payload);
      const newStatus = payload.new.status;
      if (['available', 'unavailable', 'pause', 'busy'].includes(newStatus)) {
        setLocalStatus(newStatus as Status);
      }
    },
    {
      enabled: !!userId,
      debounceTime: 100
    }
  );

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

  const handleStatusChange = async (newStatus: Status) => {
    if (!onStatusChange || localStatus === newStatus || isUpdating || !userId) return;
    
    try {
      setIsUpdating(true);
      console.log('[StatusButtonsBar] Changing status to:', newStatus);
      
      // Optimistically update local state
      setLocalStatus(newStatus);
      
      // Update status via RPC function
      const { error: dbError } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: userId,
        p_status: newStatus as string
      });
      
      if (dbError) {
        console.error('[StatusButtonsBar] Database error:', dbError);
        throw dbError;
      }
      
      // Emit event to notify components of status change
      eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE);
      console.log('[StatusButtonsBar] Status update event emitted');
      
      // Call the parent handler
      await onStatusChange(newStatus);
      console.log('[StatusButtonsBar] Status changed to:', newStatus);
      
      // Show success toast
      toast({
        title: "Statut mis à jour",
        description: `Votre statut a été changé en "${statusConfig[newStatus].label}"`,
      });
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
              isUpdating ? "opacity-70 cursor-not-allowed" : ""
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
