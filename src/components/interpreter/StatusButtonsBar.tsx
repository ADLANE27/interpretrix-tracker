
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
  const transactionIdRef = useRef<string | null>(null);
  const userId = useRef<string | null>(null);
  const updateAttemptsRef = useRef(0);
  const maxUpdateAttempts = 3;
  const verificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
  }, []);

  // Update local state when prop changes
  useEffect(() => {
    if (currentStatus && currentStatus !== localStatus) {
      console.log('[StatusButtonsBar] Current status updated from prop:', currentStatus);
      setLocalStatus(currentStatus);
    }
  }, [currentStatus, localStatus]);

  // Verify status update was successful
  const verifyStatusUpdate = async (expectedStatus: Status, attempt = 1) => {
    if (!userId.current || !isUpdating || !transactionIdRef.current) return;
    
    try {
      console.log(`[StatusButtonsBar] Verifying status update (attempt ${attempt}/${maxUpdateAttempts}). Transaction:`, transactionIdRef.current);
      
      const { data, error } = await supabase
        .from('interpreter_profiles')
        .select('status')
        .eq('id', userId.current)
        .single();
        
      if (error) {
        console.error('[StatusButtonsBar] Error verifying status update:', error);
        if (attempt < maxUpdateAttempts) {
          verificationTimeoutRef.current = setTimeout(() => {
            verifyStatusUpdate(expectedStatus, attempt + 1);
          }, 1000);
        } else {
          handleUpdateFailure('Erreur de vérification de la mise à jour');
        }
        return;
      }
      
      console.log(`[StatusButtonsBar] Database status: ${data?.status}, Expected: ${expectedStatus}`);
      
      if (data && data.status === expectedStatus) {
        console.log('[StatusButtonsBar] Status update verified successfully');
        cleanupUpdate();
        toast({
          title: "Statut mis à jour",
          description: `Votre statut est maintenant "${statusConfig[expectedStatus].label}"`,
        });
      } else if (attempt < maxUpdateAttempts) {
        console.warn('[StatusButtonsBar] Status verification failed, retrying');
        
        // Retry the update
        const { error: retryError } = await supabase.rpc('update_interpreter_status', {
          p_interpreter_id: userId.current,
          p_status: expectedStatus
        });
        
        if (retryError) {
          console.error('[StatusButtonsBar] Retry update error:', retryError);
          if (attempt >= maxUpdateAttempts - 1) {
            handleUpdateFailure('Erreur lors de la tentative de mise à jour');
          }
        } else {
          console.log('[StatusButtonsBar] Retry attempt', attempt, 'sent');
        }
        
        // Check again after a delay
        verificationTimeoutRef.current = setTimeout(() => {
          verifyStatusUpdate(expectedStatus, attempt + 1);
        }, 1000);
      } else {
        handleUpdateFailure('Le statut n\'a pas été mis à jour après plusieurs tentatives');
      }
    } catch (e) {
      console.error('[StatusButtonsBar] Exception in verification:', e);
      if (attempt < maxUpdateAttempts) {
        verificationTimeoutRef.current = setTimeout(() => {
          verifyStatusUpdate(expectedStatus, attempt + 1);
        }, 1000);
      } else {
        handleUpdateFailure('Exception lors de la vérification');
      }
    }
  };

  const cleanupUpdate = () => {
    setIsUpdating(false);
    updateAttemptsRef.current = 0;
    transactionIdRef.current = null;
    if (verificationTimeoutRef.current) {
      clearTimeout(verificationTimeoutRef.current);
      verificationTimeoutRef.current = null;
    }
  };

  const handleUpdateFailure = (errorMessage: string) => {
    console.error('[StatusButtonsBar]', errorMessage);
    cleanupUpdate();
    setLocalStatus(currentStatus);
    
    toast({
      title: "Erreur de synchronisation",
      description: "Impossible de mettre à jour votre statut. Veuillez réessayer.",
      variant: "destructive",
    });
  };

  useEffect(() => {
    return () => {
      if (verificationTimeoutRef.current) {
        clearTimeout(verificationTimeoutRef.current);
      }
    };
  }, []);

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
    if (!onStatusChange || localStatus === newStatus || isUpdating || !userId.current) return;
    
    try {
      setIsUpdating(true);
      // Generate a transaction ID for this update
      transactionIdRef.current = `status-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      console.log('[StatusButtonsBar] Starting status update transaction:', transactionIdRef.current);
      console.log('[StatusButtonsBar] Changing status to:', newStatus);
      
      // Optimistically update local state
      setLocalStatus(newStatus);
      
      // Update status directly in database
      const { error: dbError } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: userId.current,
        p_status: newStatus as string
      });
      
      if (dbError) {
        console.error('[StatusButtonsBar] Database error:', dbError);
        handleUpdateFailure(dbError.message);
        return;
      }
      
      console.log('[StatusButtonsBar] Status update sent to database');
      
      // Call the parent handler
      try {
        await onStatusChange(newStatus);
        console.log('[StatusButtonsBar] Parent handler called for status:', newStatus);
      } catch (handlerError) {
        console.error('[StatusButtonsBar] Parent handler error:', handlerError);
        // Continue with verification even if parent handler fails
      }
      
      // Start verification process
      verifyStatusUpdate(newStatus, 1);
      
    } catch (error) {
      console.error('[StatusButtonsBar] Error changing status:', error);
      handleUpdateFailure('Erreur système');
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
            {isUpdating && isActive && (
              <span className="ml-1 h-2 w-2 bg-white rounded-full animate-pulse"/>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};
