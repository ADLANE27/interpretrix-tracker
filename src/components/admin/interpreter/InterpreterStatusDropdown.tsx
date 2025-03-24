
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
import { eventEmitter, EVENT_STATUS_UPDATE } from "@/lib/events";

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
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Listen for status updates from elsewhere in the application
  useEffect(() => {
    const handleExternalStatusUpdate = (data: { status: Status, userId: string }) => {
      if (data.userId === interpreterId) {
        console.log(`[InterpreterStatusDropdown] Received external status update for ${interpreterId}:`, data.status);
        setLocalStatus(data.status as Status);
      }
    };
    
    eventEmitter.on(EVENT_STATUS_UPDATE, handleExternalStatusUpdate);
    
    return () => {
      eventEmitter.off(EVENT_STATUS_UPDATE, handleExternalStatusUpdate);
    };
  }, [interpreterId]);

  // Update local state when prop changes
  useEffect(() => {
    if (currentStatus && currentStatus !== localStatus) {
      const updateId = `${currentStatus}-${Date.now()}`;
      
      // Prevent duplicate updates
      if (updateId === lastUpdateRef.current) return;
      lastUpdateRef.current = updateId;
      
      console.log(`[InterpreterStatusDropdown] Status updated from prop for ${interpreterId}:`, currentStatus);
      setLocalStatus(currentStatus);
    }
  }, [currentStatus, interpreterId, localStatus]);

  const updateInterpreterStatusInDatabase = async (status: Status): Promise<boolean> => {
    try {
      console.log(`[InterpreterStatusDropdown] Updating status for ${interpreterId} to ${status} in database`);
      
      // Update interpreter status using RPC function
      const { error } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: interpreterId,
        p_status: status
      });

      if (error) {
        console.error('[InterpreterStatusDropdown] RPC error:', error);
        return false;
      }
      
      console.log(`[InterpreterStatusDropdown] Database update for ${interpreterId} successful`);
      return true;
    } catch (error) {
      console.error('[InterpreterStatusDropdown] Database update error:', error);
      return false;
    }
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
    if (!pendingStatus) return;
    
    retryCountRef.current = 0;
    setIsUpdating(true);
    
    try {
      console.log(`[InterpreterStatusDropdown] Updating status of ${interpreterId} to ${pendingStatus}`);
      
      // Optimistically update the local status
      setLocalStatus(pendingStatus);
      
      // Notify parent component of the status change if callback is provided
      if (onStatusChange) {
        onStatusChange(pendingStatus);
      }
      
      // Broadcast the status update
      eventEmitter.emit(EVENT_STATUS_UPDATE, {
        status: pendingStatus,
        userId: interpreterId
      });
      
      // Update interpreter status in database
      const success = await updateInterpreterStatusInDatabase(pendingStatus);
      
      if (!success) {
        throw new Error('Failed to update status in database');
      }

      toast({
        title: "Statut mis à jour",
        description: `Le statut a été changé en "${statusConfig[pendingStatus].label}"`,
      });
    } catch (error: any) {
      console.error('[InterpreterStatusDropdown] Error:', error);
      
      // Implement retry logic for database updates
      const attemptRetry = async () => {
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          console.log(`[InterpreterStatusDropdown] Retrying status update (${retryCountRef.current}/${maxRetries})`);
          
          try {
            const success = await updateInterpreterStatusInDatabase(pendingStatus);
            
            if (success) {
              console.log('[InterpreterStatusDropdown] Retry successful');
              toast({
                title: "Statut mis à jour",
                description: `Le statut a été changé en "${statusConfig[pendingStatus].label}"`,
              });
              return;
            }
          } catch (retryError) {
            console.error('[InterpreterStatusDropdown] Retry failed:', retryError);
          }
          
          // Schedule another retry with exponential backoff
          setTimeout(attemptRetry, 1000 * Math.pow(2, retryCountRef.current));
        } else {
          console.error('[InterpreterStatusDropdown] Max retries exceeded, reverting to previous status');
          
          // Revert on error after max retries
          setLocalStatus(currentStatus);
          
          toast({
            title: "Erreur",
            description: "Impossible de mettre à jour le statut après plusieurs tentatives",
            variant: "destructive",
          });
        }
      };
      
      // Start retry process
      attemptRetry();
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
