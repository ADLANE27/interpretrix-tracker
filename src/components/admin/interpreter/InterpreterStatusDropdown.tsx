import { useState, useEffect, useRef, useCallback } from "react";
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
import { useMissionUpdates } from "@/hooks/useMissionUpdates";

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
  const { updateInterpreterStatus } = useMissionUpdates(() => {});

  // Throttled status updater to prevent rapid successive updates
  const updateStatus = useCallback(async (status: Status) => {
    try {
      console.log(`[InterpreterStatusDropdown] Updating status for ${interpreterId} to ${status}`);
      
      // Use centralized status update function with improved handling
      return await updateInterpreterStatus(interpreterId, status);
    } catch (error) {
      console.error(`[InterpreterStatusDropdown] Error updating status:`, error);
      throw error;
    }
  }, [interpreterId, updateInterpreterStatus]);

  // Setup real-time subscription to interpreter status changes
  useEffect(() => {
    if (isSubscribedRef.current || !interpreterId) return;
    
    console.log(`[InterpreterStatusDropdown] Setting up real-time status handlers for interpreter ${interpreterId}`);
    
    // Listen for global status update events to prevent duplicates
    const handleStatusUpdate = (event: CustomEvent<{
      interpreter_id: string, 
      status: Status, 
      transaction_id?: string,
      timestamp?: number
    }>) => {
      const detail = event.detail;
      if (!detail || detail.interpreter_id !== interpreterId) return;
      
      console.log(`[InterpreterStatusDropdown] Received status update event for ${interpreterId}:`, detail);
      
      // Skip if the status hasn't changed
      if (!detail.status || detail.status === localStatus) return;
      
      // Create a unique update identifier
      const updateId = detail.transaction_id || `${detail.status}-${detail.timestamp || Date.now()}`;
      
      // Skip if this is a duplicate of our last update
      if (updateId === lastUpdateRef.current) {
        console.log(`[InterpreterStatusDropdown] Skipping duplicate event: ${updateId}`);
        return;
      }
      
      console.log(`[InterpreterStatusDropdown] Updating local status to ${detail.status}`);
      lastUpdateRef.current = updateId;
      setLocalStatus(detail.status);
      
      // Notify parent component
      if (onStatusChange) {
        onStatusChange(detail.status);
      }
    };
    
    window.addEventListener('interpreter-status-update', handleStatusUpdate as EventListener);
    isSubscribedRef.current = true;
    
    return () => {
      console.log(`[InterpreterStatusDropdown] Cleaning up status handlers for interpreter ${interpreterId}`);
      window.removeEventListener('interpreter-status-update', handleStatusUpdate as EventListener);
      isSubscribedRef.current = false;
    };
  }, [interpreterId, localStatus, onStatusChange]);

  // Update local state when prop changes
  useEffect(() => {
    if (currentStatus && currentStatus !== localStatus) {
      console.log(`[InterpreterStatusDropdown] Status updated from prop for ${interpreterId}:`, currentStatus);
      setLocalStatus(currentStatus);
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
    if (!pendingStatus || isUpdating) return;
    
    try {
      setIsUpdating(true);
      
      // Optimistically update the local status
      setLocalStatus(pendingStatus);
      
      // Notify parent component
      if (onStatusChange) {
        onStatusChange(pendingStatus);
      }
      
      // Update the status in the database using centralized function
      await updateStatus(pendingStatus);
      
      toast({
        title: "Statut mis à jour",
        description: `Le statut a été changé en "${statusConfig[pendingStatus].label}"`,
        duration: 3000,
      });
    } catch (error: any) {
      console.error('[InterpreterStatusDropdown] Error:', error);
      
      // Revert to previous status on error
      setLocalStatus(currentStatus);
      
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut. Veuillez réessayer.",
        variant: "destructive",
        duration: 3000,
      });
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
                disabled={isUpdating}
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
