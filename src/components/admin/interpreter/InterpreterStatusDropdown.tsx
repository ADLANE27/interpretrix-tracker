
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
  const transactionIdRef = useRef<string | null>(null);
  const updateAttemptsRef = useRef(0);
  const maxUpdateAttempts = 3;

  // Update local state when prop changes
  useEffect(() => {
    if (currentStatus && currentStatus !== localStatus) {
      console.log(`[InterpreterStatusDropdown] Status updated from prop for ${interpreterId}:`, currentStatus);
      setLocalStatus(currentStatus);
    }
  }, [currentStatus, interpreterId, localStatus]);

  // Verify status update was successful
  useEffect(() => {
    const verifyStatusUpdate = async () => {
      if (!transactionIdRef.current || !isUpdating || !pendingStatus) return;
      
      try {
        const { data, error } = await supabase
          .from('interpreter_profiles')
          .select('status')
          .eq('id', interpreterId)
          .single();
          
        if (error) {
          console.error('[InterpreterStatusDropdown] Error verifying status update:', error);
          return;
        }
        
        if (data && data.status === pendingStatus) {
          console.log('[InterpreterStatusDropdown] Status update verified successfully:', data.status);
          setIsUpdating(false);
          updateAttemptsRef.current = 0;
          transactionIdRef.current = null;
          setPendingStatus(null);
        } else if (updateAttemptsRef.current < maxUpdateAttempts) {
          console.warn('[InterpreterStatusDropdown] Status verification failed, retrying. Current DB status:', data?.status, 'Expected:', pendingStatus);
          updateAttemptsRef.current++;
          
          // Retry the update
          const { error: retryError } = await supabase.rpc('update_interpreter_status', {
            p_interpreter_id: interpreterId,
            p_status: pendingStatus
          });
          
          if (retryError) {
            console.error('[InterpreterStatusDropdown] Retry update error:', retryError);
          } else {
            console.log('[InterpreterStatusDropdown] Retry attempt', updateAttemptsRef.current, 'sent');
          }
          
          // Check again after a delay
          setTimeout(verifyStatusUpdate, 1000);
        } else {
          console.error('[InterpreterStatusDropdown] Max retry attempts reached. Status update failed.');
          setIsUpdating(false);
          updateAttemptsRef.current = 0;
          transactionIdRef.current = null;
          setPendingStatus(null);
          
          // Show error toast after max retries
          toast({
            title: "Erreur de synchronisation",
            description: "Impossible de mettre à jour le statut. Veuillez réessayer.",
            variant: "destructive",
          });
          
          // Revert to previous status
          setLocalStatus(currentStatus);
        }
      } catch (e) {
        console.error('[InterpreterStatusDropdown] Exception in verification:', e);
      }
    };
    
    if (isUpdating && transactionIdRef.current) {
      setTimeout(verifyStatusUpdate, 500); // Initial delay before first check
    }
  }, [isUpdating, pendingStatus, interpreterId, currentStatus, toast]);

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
        throw error;
      }

      // Verification will happen in the useEffect
      console.log('[InterpreterStatusDropdown] Status update sent to database');
      
      toast({
        title: "Statut mis à jour",
        description: `Le statut est en cours de mise à jour vers "${statusConfig[pendingStatus].label}"`,
      });
    } catch (error: any) {
      console.error('[InterpreterStatusDropdown] Error:', error);
      // Revert on error
      setLocalStatus(currentStatus);
      setIsUpdating(false);
      transactionIdRef.current = null;
      
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
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
    const StatusIcon = statusConfig[localStatus].icon;
    const displayLabel = isMobile ? statusConfig[localStatus].mobileLabel : statusConfig[localStatus].label;
    
    if (displayFormat === "badge") {
      return (
        <div className={`px-3 py-1 rounded-full text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity ${statusConfig[localStatus].color} ${className} ${isUpdating ? 'opacity-70' : ''}`}>
          {displayLabel}
        </div>
      );
    } else {
      return (
        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm cursor-pointer hover:opacity-90 transition-opacity ${statusConfig[localStatus].color} ${className} ${isUpdating ? 'opacity-70' : ''}`}>
          <StatusIcon className="h-4 w-4" />
          <span>{displayLabel}</span>
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
