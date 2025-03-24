
import { useState, useEffect, useRef } from "react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Clock, Coffee, X, Phone } from "lucide-react";
import { Profile } from "@/types/profile";
import { useIsMobile } from "@/hooks/use-mobile";

type Status = Profile['status'];

interface StatusConfigItem {
  color: string;
  label: string;
  mobileLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface InterpreterStatusDropdownProps {
  interpreterId: string;
  currentStatus: Status;
  className?: string;
  displayFormat?: "badge" | "button";
  onStatusChange?: (newStatus: Status) => void;
}

const statusConfig: Record<Status, StatusConfigItem> = {
  available: {
    color: "bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-sm",
    label: "Disponible",
    mobileLabel: "Dispo",
    icon: Clock
  },
  busy: {
    color: "bg-gradient-to-r from-indigo-400 to-purple-500 text-white shadow-sm", 
    label: "En appel",
    mobileLabel: "Appel",
    icon: Phone
  },
  pause: {
    color: "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm", 
    label: "En pause",
    mobileLabel: "Pause",
    icon: Coffee
  },
  unavailable: {
    color: "bg-gradient-to-r from-red-400 to-rose-500 text-white shadow-sm", 
    label: "Indisponible",
    mobileLabel: "Indispo",
    icon: X
  }
};

export const InterpreterStatusDropdown = ({ 
  interpreterId, 
  currentStatus, 
  className = "", 
  displayFormat = "badge",
  onStatusChange
}: InterpreterStatusDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<Status | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [localStatus, setLocalStatus] = useState<Status>(currentStatus);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const lastUpdateRef = useRef<string | null>(null);
  const isSubscribedRef = useRef(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const failedAttemptsRef = useRef(0);
  const maxFailedAttempts = 3;
  const circuitBreakerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCircuitBrokenRef = useRef(false);

  // Setup real-time subscription to interpreter status changes
  useEffect(() => {
    if (isSubscribedRef.current || !interpreterId) return;
    
    console.log(`[InterpreterStatusDropdown] Setting up real-time subscription for interpreter ${interpreterId}`);
    
    const channel = supabase.channel(`interpreter-status-${interpreterId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'interpreter_profiles',
          filter: `id=eq.${interpreterId}`
        },
        (payload) => {
          console.log(`[InterpreterStatusDropdown] Received update for interpreter ${interpreterId}:`, payload);
          
          if (payload.new && payload.new.status && 
              payload.new.status !== localStatus && 
              isValidStatus(payload.new.status)) {
            
            const newStatus = payload.new.status as Status;
            console.log(`[InterpreterStatusDropdown] Updated status for ${interpreterId} from ${localStatus} to ${newStatus}`);
            
            // Create a unique update ID
            const updateId = `${newStatus}-${Date.now()}`;
            
            // Prevent duplicate updates
            if (updateId === lastUpdateRef.current) return;
            lastUpdateRef.current = updateId;
            
            setLocalStatus(newStatus);
            
            // Notify parent component if callback is provided
            if (onStatusChange) {
              onStatusChange(newStatus);
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[InterpreterStatusDropdown] Successfully subscribed to updates for interpreter ${interpreterId}`);
          isSubscribedRef.current = true;
        } else {
          console.log(`[InterpreterStatusDropdown] Subscription status for interpreter ${interpreterId}:`, status);
        }
      });
      
    // Listen for global status updates
    const handleStatusUpdate = (event: CustomEvent) => {
      const detail = event.detail;
      if (detail && detail.interpreter_id === interpreterId) {
        console.log(`[InterpreterStatusDropdown] Received status update event for ${interpreterId}:`, detail.status);
        
        // Only update if the new status is different from local state
        if (detail.status && detail.status !== localStatus && isValidStatus(detail.status)) {
          setLocalStatus(detail.status as Status);
          
          // Notify parent component if callback is provided
          if (onStatusChange) {
            onStatusChange(detail.status as Status);
          }
        }
      }
    };
    
    window.addEventListener('interpreter-status-update' as any, handleStatusUpdate as EventListener);
    
    return () => {
      console.log(`[InterpreterStatusDropdown] Removing channel for interpreter ${interpreterId}`);
      supabase.removeChannel(channel);
      window.removeEventListener('interpreter-status-update' as any, handleStatusUpdate as EventListener);
      isSubscribedRef.current = false;
      
      // Clear any pending timeouts
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      if (circuitBreakerTimeoutRef.current) {
        clearTimeout(circuitBreakerTimeoutRef.current);
      }
    };
  }, [interpreterId, localStatus, onStatusChange]);

  // Update local state when prop changes
  useEffect(() => {
    if (currentStatus && currentStatus !== localStatus) {
      const updateId = `${currentStatus}-${Date.now()}`;
      
      // Prevent duplicate updates
      if (updateId === lastUpdateRef.current) return;
      lastUpdateRef.current = updateId;
      
      console.log(`[InterpreterStatusDropdown] Status updated from prop for ${interpreterId}:`, currentStatus);
      setLocalStatus(currentStatus);
      
      // Reset circuit breaker on prop update
      if (isCircuitBrokenRef.current) {
        console.log(`[InterpreterStatusDropdown] Resetting circuit breaker for ${interpreterId}`);
        isCircuitBrokenRef.current = false;
        failedAttemptsRef.current = 0;
      }
    }
  }, [currentStatus, interpreterId, localStatus]);

  const isValidStatus = (status: string): status is Status => {
    return ['available', 'unavailable', 'pause', 'busy'].includes(status);
  };

  const handleStatusSelect = (status: Status) => {
    if (status === localStatus) {
      setIsOpen(false);
      return;
    }
    setPendingStatus(status);
    setIsConfirmDialogOpen(true);
    setIsOpen(false);
  };

  const handleConfirm = async () => {
    if (!pendingStatus || isCircuitBrokenRef.current) return;
    
    try {
      setIsUpdating(true);
      console.log(`[InterpreterStatusDropdown] Updating status of ${interpreterId} to ${pendingStatus}`);
      
      // Optimistically update the local status
      setLocalStatus(pendingStatus);
      
      // Notify parent component of the status change if callback is provided
      if (onStatusChange) {
        onStatusChange(pendingStatus);
      }
      
      // Update interpreter status using RPC function
      const { error } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: interpreterId,
        p_status: pendingStatus
      });

      if (error) {
        console.error('[InterpreterStatusDropdown] RPC error:', error);
        throw error;
      }

      // Reset failed attempts on success
      failedAttemptsRef.current = 0;
      
      // Dispatch an event for other components to update
      window.dispatchEvent(new CustomEvent('interpreter-status-update', { 
        detail: { 
          interpreter_id: interpreterId,
          status: pendingStatus
        }
      }));

      toast({
        title: "Statut mis à jour",
        description: `Le statut a été changé en "${statusConfig[pendingStatus].label}"`,
        duration: 3000, // Shorter duration
      });
    } catch (error: any) {
      console.error('[InterpreterStatusDropdown] Error:', error);
      
      failedAttemptsRef.current += 1;
      console.log(`[InterpreterStatusDropdown] Failed attempts: ${failedAttemptsRef.current}/${maxFailedAttempts}`);
      
      // Implement circuit breaker pattern
      if (failedAttemptsRef.current >= maxFailedAttempts) {
        console.log(`[InterpreterStatusDropdown] Circuit breaker activated for ${interpreterId}`);
        isCircuitBrokenRef.current = true;
        
        // Reset circuit breaker after 30 seconds
        circuitBreakerTimeoutRef.current = setTimeout(() => {
          console.log(`[InterpreterStatusDropdown] Circuit breaker reset for ${interpreterId}`);
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
        // Revert on error
        setLocalStatus(currentStatus);
        
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour le statut",
          variant: "destructive",
          duration: 3000,
        });
      }
    } finally {
      setIsConfirmDialogOpen(false);
      setPendingStatus(null);
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setIsConfirmDialogOpen(false);
    setPendingStatus(null);
  };

  // Content based on display format
  const triggerContent = () => {
    const StatusIcon = statusConfig[localStatus].icon;
    const displayLabel = isMobile ? statusConfig[localStatus].mobileLabel : statusConfig[localStatus].label;
    
    if (displayFormat === "badge") {
      return (
        <div className={`px-3 py-1 rounded-full text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity ${statusConfig[localStatus].color} ${className}`}>
          {displayLabel}
        </div>
      );
    } else {
      return (
        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm cursor-pointer hover:opacity-90 transition-opacity ${statusConfig[localStatus].color} ${className}`}>
          <StatusIcon className="h-4 w-4" />
          <span>{displayLabel}</span>
        </div>
      );
    }
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          {triggerContent()}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-[180px]">
          {Object.entries(statusConfig).map(([status, config]) => {
            const StatusIcon = config.icon;
            return (
              <DropdownMenuItem 
                key={status}
                onClick={() => handleStatusSelect(status as Status)}
                className={`flex items-center gap-2 ${localStatus === status ? 'bg-muted' : ''}`}
                disabled={isCircuitBrokenRef.current}
              >
                <StatusIcon className="h-4 w-4" />
                <span>{config.label}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        title="Modifier le statut de l'interprète"
        description={pendingStatus ? 
          `Êtes-vous sûr de vouloir modifier le statut de cet interprète en "${statusConfig[pendingStatus].label}" ?` : 
          "Êtes-vous sûr de vouloir modifier le statut de cet interprète ?"}
        confirmText="Confirmer"
        cancelText="Annuler"
      />
    </>
  );
};
