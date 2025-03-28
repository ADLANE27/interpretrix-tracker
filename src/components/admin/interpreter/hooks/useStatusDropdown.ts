import { useState, useRef, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Status } from "../types/status-types";
import { useRealtimeStatus } from "@/hooks/useRealtimeStatus";
import { realtimeService } from "@/services/realtime";
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE } from '@/lib/events';
import { v4 as uuidv4 } from 'uuid';

export function useStatusDropdown(
  interpreterId: string,
  currentStatus: Status,
  onStatusChange?: (newStatus: Status) => void
) {
  const [isOpen, setIsOpen] = useState(false);
  const [localStatus, setLocalStatus] = useState<Status>(currentStatus);
  const [pendingStatus, setPendingStatus] = useState<Status | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryAttemptsRef = useRef(0);
  
  const {
    status: hookStatus,
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
    },
    onStatusChange: (newStatus) => {
      console.log(`[useStatusDropdown] Status from hook updated to ${newStatus} for ${interpreterId}`);
      setLocalStatus(newStatus);
    }
  });

  // Listen for global status updates
  useEffect(() => {
    const handleStatusUpdate = (data: { 
      interpreterId: string,
      status: Status,
      timestamp?: number,
      uuid?: string
    }) => {
      if (data.interpreterId === interpreterId && data.status !== localStatus) {
        console.log(`[useStatusDropdown] Received status update event for ${interpreterId}: ${data.status}`);
        setLocalStatus(data.status);
      }
    };
    
    eventEmitter.on(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);
    
    return () => {
      eventEmitter.off(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);
    };
  }, [interpreterId, localStatus]);

  // Keep local status in sync with current status prop
  useEffect(() => {
    if (currentStatus !== localStatus) {
      console.log(`[useStatusDropdown] Prop status changed for ${interpreterId}: ${currentStatus}`);
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
    if (!pendingStatus) return;
    
    try {
      setIsUpdating(true);
      console.log(`[StatusDropdown] Updating status of ${interpreterId} to ${pendingStatus}`);
      
      // Update local state immediately for responsive UI
      setLocalStatus(pendingStatus);
      
      // Call parent callback if provided
      if (onStatusChange) {
        onStatusChange(pendingStatus);
      }
      
      // Broadcast status change for immediate UI updates across components
      eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
        interpreterId,
        status: pendingStatus,
        timestamp: Date.now(),
        uuid: uuidv4() // Add unique ID to prevent event deduplication issues
      });
      
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
