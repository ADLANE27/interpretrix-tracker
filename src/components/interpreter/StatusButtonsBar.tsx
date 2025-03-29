import React, { useState, useEffect } from 'react';
import { Clock, Coffee, X, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Profile } from '@/types/profile';
import { useRealtimeStatus } from '@/hooks/useRealtimeStatus';

type Status = Profile['status'];

interface StatusButtonsBarProps {
  currentStatus?: Status;
  onStatusChange?: (newStatus: Status) => Promise<void>;
  variant?: 'default' | 'compact';
  interpreterId?: string;
  className?: string;
}

export const StatusButtonsBar: React.FC<StatusButtonsBarProps> = ({ 
  currentStatus = 'available', 
  onStatusChange,
  variant = 'default',
  interpreterId,
  className
}) => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const effectiveInterpreterId = interpreterId || userId;

  const {
    status: localStatus,
    updateStatus,
    isConnected
  } = useRealtimeStatus({
    interpreterId: effectiveInterpreterId || '',
    initialStatus: currentStatus,
    onStatusChange: (newStatus) => {
      console.log('[StatusButtonsBar] Status updated via realtime:', newStatus);
    }
  });

  useEffect(() => {
    if (!interpreterId) {
      import('@/integrations/supabase/client').then(({ supabase }) => {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            setUserId(user.id);
          }
        });
      });
    }
  }, [interpreterId]);

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
    console.log(`[StatusButtonsBar] Status change requested: ${newStatus}, current status: ${localStatus}`);
    
    if (localStatus === newStatus || isUpdating) {
      console.log('[StatusButtonsBar] Status is already set or updating in progress');
      return;
    }

    if (!effectiveInterpreterId) {
      console.error('[StatusButtonsBar] No interpreter ID available');
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour votre statut. ID d'interprète manquant.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUpdating(true);
    
    try {
      console.log(`[StatusButtonsBar] Updating status to ${newStatus}...`);
      const success = await updateStatus(newStatus);
      
      if (!success) {
        throw new Error('Failed to update status');
      }
      
      console.log(`[StatusButtonsBar] Status updated successfully to ${newStatus}`);
      
      if (onStatusChange) {
        await onStatusChange(newStatus);
      }
      
      toast({
        title: "Statut mis à jour",
        description: `Votre statut a été changé en "${statusConfig[newStatus].label}"`,
      });
    } catch (error) {
      console.error('[StatusButtonsBar] Error changing status:', error);
      
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour votre statut. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    console.log('[StatusButtonsBar] Props/State update:', {
      currentStatus,
      localStatus,
      effectiveInterpreterId,
      isConnected,
      isUpdating
    });
  }, [currentStatus, localStatus, effectiveInterpreterId, isConnected, isUpdating]);

  return (
    <div className={cn(
      "flex items-center gap-2 mx-auto w-full max-w-screen-sm overflow-x-auto hide-scrollbar py-1",
      variant === 'compact' ? 'px-1' : 'px-4',
      className
    )}>
      {!isConnected && (
        <div className="w-full text-center py-1 px-2 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs">
          Reconnexion en cours...
        </div>
      )}
      
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
              isUpdating || !isConnected || !effectiveInterpreterId ? "opacity-70 cursor-not-allowed" : ""
            )}
            onClick={() => handleStatusChange(statusKey)}
            whileTap={{ scale: 0.95 }}
            animate={isActive ? { scale: [1, 1.03, 1] } : {}}
            transition={{ duration: 0.2 }}
            disabled={isUpdating || !isConnected || !effectiveInterpreterId}
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
