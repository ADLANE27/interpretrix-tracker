
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
  const pendingTransactionsRef = useRef<Map<string, Status>>(new Map());
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get user ID once on component mount
  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId.current = user.id;
      }
    };
    
    fetchUserId();
  }, []);

  // Update local state when prop changes
  useEffect(() => {
    if (currentStatus && currentStatus !== localStatus) {
      const updateId = `${currentStatus}-${Date.now()}`;
      
      // Prevent duplicate updates
      if (updateId === lastUpdateRef.current) return;
      lastUpdateRef.current = updateId;
      
      console.log('[StatusButtonsBar] Current status updated from prop:', currentStatus);
      setLocalStatus(currentStatus);
    }
  }, [currentStatus, localStatus]);

  // Verify pending transactions
  const verifyPendingTransaction = useCallback(async (transactionId: string) => {
    if (!userId.current || !pendingTransactionsRef.current.has(transactionId)) return;
    
    try {
      console.log(`[StatusButtonsBar] Verifying pending transaction: ${transactionId}`);
      
      // Get the expected status from the pending transactions map
      const expectedStatus = pendingTransactionsRef.current.get(transactionId);
      if (!expectedStatus) return;
      
      // Fetch the current status from the database
      const { data, error } = await supabase
        .from('interpreter_profiles')
        .select('status')
        .eq('id', userId.current)
        .single();
        
      if (error) throw error;
      
      const currentDbStatus = data.status as Status;
      
      // If the database status doesn't match what we expect
      if (currentDbStatus !== expectedStatus) {
        console.warn(`[StatusButtonsBar] Status verification failed. Expected: ${expectedStatus}, Got: ${currentDbStatus}`);
        
        // Attempt to retry the update
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        
        retryTimeoutRef.current = setTimeout(async () => {
          console.log(`[StatusButtonsBar] Retrying update to ${expectedStatus}`);
          
          const { error: retryError } = await supabase.rpc('update_interpreter_status', {
            p_interpreter_id: userId.current,
            p_status: expectedStatus as string,
            p_transaction_id: `retry-${transactionId}`
          });
          
          if (retryError) {
            console.error('[StatusButtonsBar] Retry failed:', retryError);
            toast({
              title: "Erreur de synchronisation",
              description: "Votre statut n'a pas pu être mis à jour correctement. Veuillez réessayer.",
              variant: "destructive",
            });
            
            // Set local status to match what's in the database
            setLocalStatus(currentDbStatus);
          } else {
            console.log(`[StatusButtonsBar] Retry successful: ${expectedStatus}`);
          }
          
          // Remove from pending transactions
          pendingTransactionsRef.current.delete(transactionId);
        }, 2000);
      } else {
        console.log(`[StatusButtonsBar] Status verified successfully: ${expectedStatus}`);
        pendingTransactionsRef.current.delete(transactionId);
      }
    } catch (error) {
      console.error('[StatusButtonsBar] Verification error:', error);
      pendingTransactionsRef.current.delete(transactionId);
    }
  }, [toast]);

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
    if (!onStatusChange || localStatus === newStatus || isUpdating) return;
    
    try {
      setIsUpdating(true);
      console.log('[StatusButtonsBar] Changing status to:', newStatus);
      
      // Create a unique transaction ID
      const transactionId = `status-update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Optimistically update local state
      setLocalStatus(newStatus);
      
      // Add to pending transactions
      pendingTransactionsRef.current.set(transactionId, newStatus);
      
      // Update status directly in database first
      if (userId.current) {
        console.log(`[StatusButtonsBar] Updating database status with transaction ID: ${transactionId}`);
        
        const { error: dbError } = await supabase.rpc('update_interpreter_status', {
          p_interpreter_id: userId.current,
          p_status: newStatus as string,
          p_transaction_id: transactionId
        });
        
        if (dbError) {
          console.error('[StatusButtonsBar] Database error:', dbError);
          throw dbError;
        }
      }
      
      // Dispatch custom event after database update
      if (userId.current) {
        window.dispatchEvent(
          new CustomEvent('specific-interpreter-status-update', {
            detail: { interpreterId: userId.current, newStatus, transactionId }
          })
        );
      }
      
      // Call the parent handler
      await onStatusChange(newStatus);
      console.log('[StatusButtonsBar] Status changed to:', newStatus);
      
      // Verify the transaction after a short delay
      setTimeout(() => {
        verifyPendingTransaction(transactionId);
      }, 3000);
      
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
