
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
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    if (isSubscribedRef.current || !interpreterId) return;
    
    console.log(`[InterpreterStatusDropdown] Setting up real-time status handler for interpreter ${interpreterId}`);
    
    // Initial fetch of current status
    const fetchCurrentStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('interpreter_profiles')
          .select('status')
          .eq('id', interpreterId)
          .single();
        
        if (!error && data && data.status) {
          console.log(`[InterpreterStatusDropdown] Initial status fetch for ${interpreterId}:`, data.status);
          setLocalStatus(data.status as Status);
          
          if (onStatusChange) {
            onStatusChange(data.status as Status);
          }
        }
      } catch (err) {
        console.error('[InterpreterStatusDropdown] Error fetching initial status:', err);
      }
    };
    
    fetchCurrentStatus();
    
    const handleStatusUpdate = (event: CustomEvent<{
      interpreter_id: string, 
      status: Status, 
      timestamp?: number
    }>) => {
      const detail = event.detail;
      if (!detail || detail.interpreter_id !== interpreterId) return;
      
      console.log(`[InterpreterStatusDropdown] Received status update event for ${interpreterId}:`, detail);
      
      if (!detail.status || detail.status === localStatus) return;
      
      console.log(`[InterpreterStatusDropdown] Updating local status to ${detail.status}`);
      setLocalStatus(detail.status);
      
      if (onStatusChange) {
        onStatusChange(detail.status);
      }
    };
    
    window.addEventListener('interpreter-status-update', handleStatusUpdate as EventListener);
    isSubscribedRef.current = true;
    
    // Setup a direct subscription to interpreter_profiles table for this interpreter
    const channel = supabase.channel(`interpreter-status-${interpreterId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'interpreter_profiles',
        filter: `id=eq.${interpreterId}`
      }, (payload) => {
        if (payload.new && payload.new.status && payload.new.status !== localStatus) {
          console.log(`[InterpreterStatusDropdown] Database change for ${interpreterId}:`, payload.new.status);
          setLocalStatus(payload.new.status as Status);
          
          if (onStatusChange) {
            onStatusChange(payload.new.status as Status);
          }
        }
      })
      .subscribe((status) => {
        console.log(`[InterpreterStatusDropdown] Subscription status: ${status}`);
      });
    
    return () => {
      console.log(`[InterpreterStatusDropdown] Cleaning up status handler for interpreter ${interpreterId}`);
      window.removeEventListener('interpreter-status-update', handleStatusUpdate as EventListener);
      supabase.removeChannel(channel);
      isSubscribedRef.current = false;
    };
  }, [interpreterId, localStatus, onStatusChange]);

  useEffect(() => {
    if (currentStatus && currentStatus !== localStatus) {
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

  const handleConfirm = async () => {
    if (!pendingStatus || isUpdating) return;
    
    try {
      setIsUpdating(true);
      
      // Update local state for instant feedback
      setLocalStatus(pendingStatus);
      
      if (onStatusChange) {
        onStatusChange(pendingStatus);
      }
      
      // Direct database update instead of RPC
      const { error } = await supabase
        .from('interpreter_profiles')
        .update({ status: pendingStatus })
        .eq('id', interpreterId);
        
      if (error) {
        throw error;
      }
      
      // Manually dispatch event for other components
      window.dispatchEvent(new CustomEvent('interpreter-status-update', { 
        detail: { 
          interpreter_id: interpreterId,
          status: pendingStatus,
          timestamp: Date.now()
        }
      }));
      
      toast({
        title: "Statut mis à jour",
        description: `Le statut a été changé en "${statusConfig[pendingStatus].label}"`,
        duration: 3000,
      });
    } catch (error: any) {
      console.error('[InterpreterStatusDropdown] Error:', error);
      
      // Revert local status on error
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
