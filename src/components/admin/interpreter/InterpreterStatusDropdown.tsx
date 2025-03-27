
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
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE } from '@/lib/events';

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
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  // Dedicated channel for this interpreter's status
  const channelRef = useRef<any>(null);

  useEffect(() => {
    // Set up a dedicated channel for this interpreter's status updates
    const statusChannel = supabase.channel(`interpreter-status-${interpreterId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'interpreter_profiles',
        filter: `id=eq.${interpreterId}`
      }, (payload) => {
        if (payload.new && payload.new.status) {
          console.log(`[InterpreterStatusDropdown] Received direct status update for ${interpreterId}: ${payload.new.status}`);
          setLocalStatus(payload.new.status as Status);
        }
      })
      .subscribe(status => {
        console.log(`[InterpreterStatusDropdown] Status channel subscription status for ${interpreterId}:`, status);
      });
    
    channelRef.current = statusChannel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [interpreterId]);

  // Listen for status updates from event emitter
  useEffect(() => {
    const handleExternalStatusUpdate = () => {
      // Fetch the latest status directly from the database to ensure consistency
      const fetchCurrentStatus = async () => {
        try {
          const { data, error } = await supabase
            .from('interpreter_profiles')
            .select('status')
            .eq('id', interpreterId)
            .single();

          if (error) {
            console.error('[InterpreterStatusDropdown] Error fetching status:', error);
            return;
          }

          if (data && data.status && data.status !== localStatus) {
            console.log(`[InterpreterStatusDropdown] External update for ${interpreterId}: ${data.status}`);
            setLocalStatus(data.status as Status);
          }
        } catch (err) {
          console.error('[InterpreterStatusDropdown] Fetch error:', err);
        }
      };

      fetchCurrentStatus();
    };

    eventEmitter.on(EVENT_INTERPRETER_STATUS_UPDATE, handleExternalStatusUpdate);
    
    return () => {
      eventEmitter.off(EVENT_INTERPRETER_STATUS_UPDATE, handleExternalStatusUpdate);
    };
  }, [interpreterId, localStatus]);

  // Update local state when prop changes
  useEffect(() => {
    if (currentStatus && currentStatus !== localStatus) {
      const updateId = `${currentStatus}-${Date.now()}`;
      
      if (updateId === lastUpdateRef.current) return;
      lastUpdateRef.current = updateId;
      
      console.log(`[InterpreterStatusDropdown] Status updated from prop for ${interpreterId}:`, currentStatus);
      setLocalStatus(currentStatus);
    }
  }, [currentStatus, interpreterId, localStatus]);

  const handleStatusSelect = (status: Status) => {
    if (status === localStatus) {
      setIsOpen(false);
      return;
    }
    setPendingStatus(status);
    setIsConfirmDialogOpen(true);
    setIsOpen(false);
  };

  const updateInterpreterStatus = async (interpreterId: string, status: Status): Promise<boolean> => {
    try {
      // Use the RPC function for consistent status updates
      const { error } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: interpreterId,
        p_status: status
      });

      if (error) {
        console.error('[InterpreterStatusDropdown] RPC error:', error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('[InterpreterStatusDropdown] Update error:', error);
      return false;
    }
  };

  const verifyStatusUpdate = async (interpreterId: string, expectedStatus: Status): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('interpreter_profiles')
        .select('status')
        .eq('id', interpreterId)
        .single();
        
      if (error) {
        console.error('[InterpreterStatusDropdown] Verification fetch error:', error);
        return false;
      }
      
      return data?.status === expectedStatus;
    } catch (err) {
      console.error('[InterpreterStatusDropdown] Verification error:', err);
      return false;
    }
  };

  const handleConfirm = async () => {
    if (!pendingStatus) return;
    
    try {
      setIsUpdating(true);
      console.log(`[InterpreterStatusDropdown] Updating status of ${interpreterId} to ${pendingStatus}`);
      
      // Optimistically update UI
      setLocalStatus(pendingStatus);
      
      // Call parent callback if provided
      if (onStatusChange) {
        onStatusChange(pendingStatus);
      }
      
      let updateSuccess = false;
      retryCountRef.current = 0;
      
      // Try to update with retries
      while (retryCountRef.current < MAX_RETRIES && !updateSuccess) {
        updateSuccess = await updateInterpreterStatus(interpreterId, pendingStatus);
        
        if (!updateSuccess) {
          retryCountRef.current++;
          if (retryCountRef.current < MAX_RETRIES) {
            // Exponential backoff
            const delay = Math.pow(2, retryCountRef.current) * 500;
            console.log(`[InterpreterStatusDropdown] Retrying update (${retryCountRef.current}/${MAX_RETRIES}) in ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      if (!updateSuccess) {
        throw new Error(`Failed to update status after ${MAX_RETRIES} attempts`);
      }
      
      // Emit event after successful update
      eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE);
      
      // Verify the update after a short delay
      setTimeout(async () => {
        const isVerified = await verifyStatusUpdate(interpreterId, pendingStatus);
        
        if (!isVerified) {
          console.warn(`[InterpreterStatusDropdown] Verification failed for ${interpreterId} status update to ${pendingStatus}`);
          // Make one final direct attempt without going through the retry loop
          await updateInterpreterStatus(interpreterId, pendingStatus);
          eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE);
        }
      }, 1000);

      toast({
        title: "Statut mis à jour",
        description: `Le statut a été changé en "${statusConfig[pendingStatus].label}"`,
      });
    } catch (error: any) {
      console.error('[InterpreterStatusDropdown] Error:', error);
      
      // Revert UI state
      setLocalStatus(currentStatus);
      
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsConfirmDialogOpen(false);
      setPendingStatus(null);
      setIsUpdating(false);
      retryCountRef.current = 0;
    }
  };

  const handleCancel = () => {
    setIsConfirmDialogOpen(false);
    setPendingStatus(null);
  };

  const triggerContent = () => {
    const StatusIcon = statusConfig[localStatus].icon;
    const displayLabel = isMobile ? statusConfig[localStatus].mobileLabel : statusConfig[localStatus].label;
    
    if (displayFormat === "badge") {
      return (
        <div className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity ${statusConfig[localStatus].color} ${className}`}>
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
