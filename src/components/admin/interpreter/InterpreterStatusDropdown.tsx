
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
  onStatusChange?: (newStatus: Status) => void | Promise<void>;
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
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const errorCountRef = useRef(0);
  const toastRef = useRef<{ id: string; dismiss: () => void } | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (toastRef.current) {
        toastRef.current.dismiss();
      }
    };
  }, []);

  // Update local state when prop changes
  useEffect(() => {
    if (currentStatus && currentStatus !== localStatus) {
      const updateId = `${currentStatus}-${Date.now()}`;
      
      // Prevent duplicate updates
      if (updateId === lastUpdateRef.current) return;
      lastUpdateRef.current = updateId;
      
      console.log(`[InterpreterStatusDropdown] Status updated from prop for ${interpreterId}:`, currentStatus);
      setLocalStatus(currentStatus);
      
      // Reset error count
      errorCountRef.current = 0;
      
      // Clear any active toast
      if (toastRef.current) {
        toastRef.current.dismiss();
        toastRef.current = null;
      }
    }
  }, [currentStatus, interpreterId, localStatus]);

  // Listen for local status update events
  useEffect(() => {
    const handleLocalStatusUpdate = (event: CustomEvent) => {
      const { interpreterId: updatedId, status: newStatus } = event.detail;
      if (updatedId === interpreterId) {
        console.log(`[InterpreterStatusDropdown] Received local status update for ${interpreterId}:`, newStatus);
        setLocalStatus(newStatus);
      }
    };
    
    window.addEventListener('local-interpreter-status-update', handleLocalStatusUpdate as EventListener);
    
    return () => {
      window.removeEventListener('local-interpreter-status-update', handleLocalStatusUpdate as EventListener);
    };
  }, [interpreterId]);

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
    
    try {
      setIsUpdating(true);
      console.log(`[InterpreterStatusDropdown] Updating status of ${interpreterId} to ${pendingStatus}`);
      
      // Dismiss any existing error toast
      if (toastRef.current) {
        toastRef.current.dismiss();
        toastRef.current = null;
      }
      
      // Optimistically update the local status
      setLocalStatus(pendingStatus);
      
      // Update interpreter status using RPC function - this is the authoritative update
      const { error } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: interpreterId,
        p_status: pendingStatus
      });

      if (error) {
        console.error('[InterpreterStatusDropdown] RPC error:', error);
        // Revert on error
        setLocalStatus(currentStatus);
        throw error;
      }
      
      // Notify parent component of the status change if callback is provided
      if (onStatusChange) {
        try {
          const result = onStatusChange(pendingStatus);
          if (result instanceof Promise) {
            await result;
          }
        } catch (error) {
          console.error('[InterpreterStatusDropdown] Error in parent callback:', error);
          // We don't revert the status here since the database update succeeded
        }
      }

      // Reset error count on success
      errorCountRef.current = 0;
      
      toast({
        title: "Statut mis à jour",
        description: `Le statut a été changé en "${statusConfig[pendingStatus].label}"`,
        duration: 3000,
      });
      
      // Dispatch an event to synchronize other components
      window.dispatchEvent(new CustomEvent('local-interpreter-status-update', { 
        detail: { interpreterId, status: pendingStatus }
      }));
    } catch (error: any) {
      console.error('[InterpreterStatusDropdown] Error:', error);
      errorCountRef.current++;
      
      if (!toastRef.current) {
        toastRef.current = toast({
          title: "Erreur",
          description: "Impossible de mettre à jour le statut",
          variant: "destructive",
          duration: 5000,
        });
      }
      
      // Retry the update once after a delay if it's not a user-rejected operation
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      if (errorCountRef.current < 2) {
        retryTimeoutRef.current = setTimeout(() => {
          console.log(`[InterpreterStatusDropdown] Retrying status update for ${interpreterId} to ${pendingStatus}`);
          retryTimeoutRef.current = null;
          handleConfirm();
        }, 3000);
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
          {(Object.entries(statusConfig) as [Status, StatusConfigItem][]).map(([status, config]) => {
            const StatusIcon = config.icon;
            return (
              <DropdownMenuItem 
                key={status}
                onClick={() => handleStatusSelect(status)}
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
