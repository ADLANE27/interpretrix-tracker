import { useState, useRef, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Status } from "../types/status-types";
import { useRealtimeStatus } from "@/hooks/useRealtimeStatus";
import { realtimeService } from "@/services/realtime";
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE, shouldProcessEvent } from '@/lib/events';
import { v4 as uuidv4 } from 'uuid';

const STATUS_UPDATE_DEBOUNCE_TIME = 800; // Increased from 300ms to 800ms

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
  const lastEventIdRef = useRef<string | null>(null);
  const lastStatusUpdateRef = useRef<number>(0);
  const toastShownForStatusRef = useRef<{[key: string]: boolean}>({});
  const [animating, setAnimating] = useState(false);
  
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
      
      // Prevent updates if we've just sent one (avoid feedback loops)
      const now = Date.now();
      if (now - lastStatusUpdateRef.current < STATUS_UPDATE_DEBOUNCE_TIME) {
        console.log(`[useStatusDropdown] Ignoring status update during debounce period`);
        return;
      }
      
      // Check if this is a duplicate or already handled status update
      if (!shouldProcessEvent(interpreterId, EVENT_INTERPRETER_STATUS_UPDATE, newStatus)) {
        console.log(`[useStatusDropdown] Skipping duplicate status update for ${interpreterId}: ${newStatus}`);
        return;
      }
      
      // Set animating state first for visual feedback
      setAnimating(true);
      setTimeout(() => setAnimating(false), 800);
      
      // Update local status
      setLocalStatus(newStatus);
    }
  });

  // Listen for global status updates
  useEffect(() => {
    const handleStatusUpdate = (data: { 
      interpreterId: string,
      status: Status,
      timestamp?: number,
      uuid?: string,
      source?: string
    }) => {
      if (data.interpreterId !== interpreterId) return;
      
      // Prevent processing our own triggered events to avoid loops
      if (data.source === 'dropdown-' + interpreterId) {
        console.log(`[useStatusDropdown] Ignoring self-triggered event`);
        return;
      }
      
      // Prevent duplicate event processing
      if (data.uuid && data.uuid === lastEventIdRef.current) {
        console.log(`[useStatusDropdown] Duplicate event detected and ignored`);
        return;
      }
      
      // Store the event uuid to prevent reprocessing
      if (data.uuid) {
        lastEventIdRef.current = data.uuid;
      }
      
      const now = Date.now();
      const timeSinceLastUpdate = now - lastStatusUpdateRef.current;
      
      if (timeSinceLastUpdate < STATUS_UPDATE_DEBOUNCE_TIME) {
        console.log(`[useStatusDropdown] Ignoring status update during debounce period`);
        return;
      }
      
      // Check if this is a duplicate status update
      if (!shouldProcessEvent(interpreterId, EVENT_INTERPRETER_STATUS_UPDATE, data.status, data.uuid)) {
        console.log(`[useStatusDropdown] Skipping duplicate status event for ${interpreterId}: ${data.status}`);
        return;
      }
      
      if (data.status !== localStatus) {
        console.log(`[useStatusDropdown] Received status update event for ${interpreterId}: ${data.status}`);
        
        // Set animating state for visual feedback
        setAnimating(true);
        setTimeout(() => setAnimating(false), 800);
        
        setLocalStatus(data.status);
        
        // Only show toast for status updates from external sources (not from this dropdown)
        // and only once per status to avoid toast spam
        if (!data.source && !toastShownForStatusRef.current[data.status]) {
          toast({
            title: "Statut mis à jour",
            description: `Le statut a été mis à jour en "${data.status}"`,
          });
          toastShownForStatusRef.current[data.status] = true;
          
          // Reset toast tracking after a delay
          setTimeout(() => {
            toastShownForStatusRef.current[data.status] = false;
          }, 10000);
        }
      }
    };
    
    eventEmitter.on(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);
    
    return () => {
      eventEmitter.off(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);
    };
  }, [interpreterId, localStatus, toast]);

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
      
      // Set animating state for visual feedback
      setAnimating(true);
      setTimeout(() => setAnimating(false), 800);
      
      // Update local state immediately for responsive UI
      setLocalStatus(pendingStatus);
      
      // Update timestamp to prevent feedback loops
      lastStatusUpdateRef.current = Date.now();
      
      // Call parent callback if provided
      if (onStatusChange) {
        onStatusChange(pendingStatus);
      }
      
      // Generate a unique id for this update
      const updateId = uuidv4();
      lastEventIdRef.current = updateId;
      
      // Reset toast tracking for this status since we're actively changing it
      toastShownForStatusRef.current[pendingStatus] = true;
      
      // Broadcast status change for immediate UI updates across components
      // Add source identifier to prevent event loops
      eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
        interpreterId,
        status: pendingStatus,
        timestamp: Date.now(),
        uuid: updateId, // Add unique ID to prevent event deduplication issues
        source: 'dropdown-' + interpreterId // Track this dropdown as the source
      });
      
      const success = await updateStatus(pendingStatus);
      
      if (!success) {
        throw new Error('Failed to update status');
      }

      toast({
        title: "Statut mis à jour",
        description: `Le statut a été changé en "${pendingStatus}"`,
      });
      
      // Reset toast tracking after a delay
      setTimeout(() => {
        if (toastShownForStatusRef.current[pendingStatus]) {
          toastShownForStatusRef.current[pendingStatus] = false;
        }
      }, 10000);
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
    isAnimating: animating,
    handleStatusSelect,
    handleConfirm,
    handleCancel,
    retryConnection
  };
}
