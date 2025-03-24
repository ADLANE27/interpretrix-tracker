
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
  onStatusChange?: (interpreterId: string, newStatus: Status) => void;
}

// Define the allowable status values to ensure type safety
const allowableStatuses: Status[] = ["available", "unavailable", "pause", "busy"];

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
  // Ensure currentStatus is valid, defaulting to "unavailable" if not
  const validatedStatus: Status = allowableStatuses.includes(currentStatus) ? currentStatus : "unavailable";
  
  const [isOpen, setIsOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<Status | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [localStatus, setLocalStatus] = useState<Status>(validatedStatus);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const transactionIdRef = useRef<string | null>(null);
  const verificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxUpdateAttempts = 3;

  // Log initial status for debugging
  useEffect(() => {
    console.log(`[InterpreterStatusDropdown] Initial status for ${interpreterId}:`, validatedStatus);
  }, [interpreterId, validatedStatus]);

  // Update local state when prop changes
  useEffect(() => {
    if (currentStatus && currentStatus !== localStatus && allowableStatuses.includes(currentStatus)) {
      console.log(`[InterpreterStatusDropdown] Status updated from prop for ${interpreterId}:`, currentStatus);
      setLocalStatus(currentStatus);
    }
  }, [currentStatus, interpreterId, localStatus]);

  // Cleanup function
  const cleanupUpdate = () => {
    setIsUpdating(false);
    transactionIdRef.current = null;
    setPendingStatus(null);
    if (verificationTimeoutRef.current) {
      clearTimeout(verificationTimeoutRef.current);
      verificationTimeoutRef.current = null;
    }
  };

  // Handle update failure
  const handleUpdateFailure = (expectedStatus: Status, errorMessage: string) => {
    console.error(`[InterpreterStatusDropdown] Update failure: ${errorMessage}`);
    cleanupUpdate();
    setLocalStatus(currentStatus);
    
    toast({
      title: "Erreur de synchronisation",
      description: "Impossible de mettre à jour le statut. Veuillez réessayer.",
      variant: "destructive",
    });
  };

  // Verify status update was successful
  const verifyStatusUpdate = async (expectedStatus: Status, attempt = 1) => {
    if (!transactionIdRef.current || !isUpdating || !pendingStatus) return;
    
    try {
      console.log(`[InterpreterStatusDropdown] Verifying status update for ${interpreterId} (attempt ${attempt}/${maxUpdateAttempts}). Transaction:`, transactionIdRef.current);
      
      const { data, error } = await supabase
        .from('interpreter_profiles')
        .select('status')
        .eq('id', interpreterId)
        .single();
        
      if (error) {
        console.error('[InterpreterStatusDropdown] Error verifying status update:', error);
        if (attempt < maxUpdateAttempts) {
          verificationTimeoutRef.current = setTimeout(() => {
            verifyStatusUpdate(expectedStatus, attempt + 1);
          }, 1000);
        } else {
          handleUpdateFailure(expectedStatus, 'Erreur de vérification');
        }
        return;
      }
      
      console.log(`[InterpreterStatusDropdown] Database status for ${interpreterId}:`, data?.status, 'Expected:', expectedStatus);
      
      if (data && data.status === expectedStatus) {
        console.log('[InterpreterStatusDropdown] Status update verified successfully:', data.status);
        cleanupUpdate();
        toast({
          title: "Statut mis à jour",
          description: `Le statut a été mis à jour vers "${statusConfig[expectedStatus].label}"`,
        });
      } else if (attempt < maxUpdateAttempts) {
        console.warn('[InterpreterStatusDropdown] Status verification failed, retrying. Current DB status:', data?.status, 'Expected:', expectedStatus);
        
        // Retry the update
        const { error: retryError } = await supabase.rpc('update_interpreter_status', {
          p_interpreter_id: interpreterId,
          p_status: expectedStatus
        });
        
        if (retryError) {
          console.error('[InterpreterStatusDropdown] Retry update error:', retryError);
          if (attempt >= maxUpdateAttempts - 1) {
            handleUpdateFailure(expectedStatus, 'Erreur de mise à jour');
          }
        } else {
          console.log('[InterpreterStatusDropdown] Retry attempt', attempt, 'sent');
        }
        
        // Check again after a delay
        verificationTimeoutRef.current = setTimeout(() => {
          verifyStatusUpdate(expectedStatus, attempt + 1);
        }, 1000);
      } else {
        console.error('[InterpreterStatusDropdown] Max verification attempts reached');
        handleUpdateFailure(expectedStatus, 'Échec après plusieurs tentatives');
      }
    } catch (e) {
      console.error('[InterpreterStatusDropdown] Exception in verification:', e);
      if (attempt < maxUpdateAttempts) {
        verificationTimeoutRef.current = setTimeout(() => {
          verifyStatusUpdate(expectedStatus, attempt + 1);
        }, 1000);
      } else {
        handleUpdateFailure(expectedStatus, 'Exception dans le processus de vérification');
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (verificationTimeoutRef.current) {
        clearTimeout(verificationTimeoutRef.current);
      }
    };
  }, []);

  const handleStatusSelect = (status: Status) => {
    if (status === localStatus) {
      setIsOpen(false);
      return;
    }
    
    console.log(`[InterpreterStatusDropdown] Status selection initiated for ${interpreterId}:`, status);
    setPendingStatus(status);
    setIsConfirmDialogOpen(true);
    setIsOpen(false);
  };

  const handleConfirm = async () => {
    if (!pendingStatus) return;
    
    try {
      setIsUpdating(true);
      // Generate a transaction ID for this update
      transactionIdRef.current = `admin-status-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      console.log(`[InterpreterStatusDropdown] Starting status update transaction:`, transactionIdRef.current);
      console.log(`[InterpreterStatusDropdown] Updating status of ${interpreterId} to ${pendingStatus}`);
      
      // Optimistically update the local status
      setLocalStatus(pendingStatus);
      
      // Notify parent component of the status change if callback is provided
      if (onStatusChange) {
        onStatusChange(interpreterId, pendingStatus);
      }
      
      // Update interpreter status using RPC function
      const { error } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: interpreterId,
        p_status: pendingStatus
      });

      if (error) {
        console.error('[InterpreterStatusDropdown] RPC error:', error);
        handleUpdateFailure(pendingStatus, error.message);
        setIsConfirmDialogOpen(false);
        return;
      }

      // Verification will happen in a separate function
      console.log('[InterpreterStatusDropdown] Status update sent to database, starting verification');
      
      // Start verification
      verifyStatusUpdate(pendingStatus, 1);
      
      toast({
        title: "Mise à jour en cours",
        description: `Le statut est en cours de mise à jour vers "${statusConfig[pendingStatus].label}"`,
      });
    } catch (error: any) {
      console.error('[InterpreterStatusDropdown] Error:', error);
      handleUpdateFailure(pendingStatus, error.message || 'Erreur inattendue');
    } finally {
      setIsConfirmDialogOpen(false);
    }
  };

  const handleCancel = () => {
    setIsConfirmDialogOpen(false);
    setPendingStatus(null);
  };

  // Content based on display format
  const triggerContent = () => {
    // Ensure we're using a valid status
    const displayStatus = allowableStatuses.includes(localStatus) ? localStatus : "unavailable";
    const StatusIcon = statusConfig[displayStatus].icon;
    const displayLabel = isMobile ? statusConfig[displayStatus].mobileLabel : statusConfig[displayStatus].label;
    
    if (displayFormat === "badge") {
      return (
        <div className={`px-3 py-1 rounded-full text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity flex items-center gap-1 ${statusConfig[displayStatus].color} ${className} ${isUpdating ? 'opacity-70' : ''}`}>
          <StatusIcon className="h-3.5 w-3.5 mr-1" />
          <span>{displayLabel}</span>
          {isUpdating && (
            <span className="ml-1 h-1.5 w-1.5 bg-white rounded-full animate-pulse"/>
          )}
        </div>
      );
    } else {
      return (
        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm cursor-pointer hover:opacity-90 transition-opacity ${statusConfig[displayStatus].color} ${className} ${isUpdating ? 'opacity-70' : ''}`}>
          <StatusIcon className="h-4 w-4" />
          <span>{displayLabel}</span>
          {isUpdating && (
            <span className="ml-1 h-1.5 w-1.5 bg-white rounded-full animate-pulse"/>
          )}
        </div>
      );
    }
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild disabled={isUpdating}>
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
