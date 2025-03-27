
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Status } from "../types/status-types";
import { useRealtimeStatus } from "@/hooks/useRealtimeStatus";

export function useStatusDropdown(
  interpreterId: string,
  currentStatus: Status,
  onStatusChange?: (newStatus: Status) => void
) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<Status | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    status: localStatus,
    updateStatus,
    isConnected
  } = useRealtimeStatus({
    interpreterId,
    initialStatus: currentStatus
  });

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
      console.log(`[StatusDropdown] Updating status of ${interpreterId} to ${pendingStatus}`);
      
      // Call parent callback if provided
      if (onStatusChange) {
        onStatusChange(pendingStatus);
      }
      
      const success = await updateStatus(pendingStatus);
      
      if (!success) {
        throw new Error('Failed to update status');
      }

      toast({
        title: "Statut mis à jour",
        description: `Le statut a été changé en "${pendingStatus}"`,
        variant: "default"
      });
    } catch (error: any) {
      console.error('[StatusDropdown] Error:', error);
      
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut. Veuillez réessayer.",
        variant: "destructive",
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

  return {
    isOpen,
    setIsOpen,
    localStatus,
    pendingStatus,
    isConfirmDialogOpen,
    isUpdating,
    isConnected,
    handleStatusSelect,
    handleConfirm,
    handleCancel
  };
}
