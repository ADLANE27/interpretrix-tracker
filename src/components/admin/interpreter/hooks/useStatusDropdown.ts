
import { useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Status } from "../types/status-types";
import { useRealtimeStatus } from "@/hooks/useRealtimeStatus";
import { realtimeService } from "@/services/realtime";

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
  const retryAttemptsRef = useRef(0);
  
  const {
    status: localStatus,
    updateStatus,
    isConnected
  } = useRealtimeStatus({
    interpreterId,
    initialStatus: currentStatus,
    onConnectionStateChange: (connected) => {
      // Reset retry attempts when connected
      if (connected) {
        retryAttemptsRef.current = 0;
      }
    }
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
      
      // Immediate broadcast for instant UI updates
      realtimeService.broadcastStatusUpdate(interpreterId, pendingStatus);
      
      const success = await updateStatus(pendingStatus);
      
      if (!success) {
        throw new Error('Failed to update status');
      }

      toast({
        title: "Statut mis à jour",
        description: `Le statut a été changé en "${pendingStatus}"`,
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
  
  // Add a force retry connection function
  const retryConnection = useCallback(() => {
    if (retryAttemptsRef.current >= 5) {
      // Too many retries, we'll need to do a full reconnect
      console.log('[StatusDropdown] Too many retry attempts, performing full reconnect');
      realtimeService.reconnectAll();
      
      toast({
        title: "Reconnexion en cours",
        description: "Tentative de reconnexion aux services en temps réel...",
      });
    } else {
      console.log('[StatusDropdown] Attempting targeted reconnect for interpreter status');
      retryAttemptsRef.current++;
      realtimeService.subscribeToInterpreterStatus(interpreterId);
    }
  }, [interpreterId, toast]);

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
    handleCancel,
    retryConnection
  };
}
