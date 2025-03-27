import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE, EVENT_INTERPRETER_BADGE_UPDATE } from '@/lib/events';
import { Profile } from '@/types/profile';

interface UseInterpreterStatusSyncOptions {
  interpreterId: string;
  onStatusChange?: (newStatus: Profile['status']) => void;
  initialStatus?: Profile['status'];
  isAdmin?: boolean;
}

/**
 * A hook to maintain interpreter status synchronization between 
 * interpreter interface and admin interface
 */
export const useInterpreterStatusSync = ({
  interpreterId,
  onStatusChange,
  initialStatus = 'available',
  isAdmin = false
}: UseInterpreterStatusSyncOptions) => {
  const channelRef = useRef<any>(null);
  const statusUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!interpreterId) return;
    
    console.log(`[useInterpreterStatusSync] Setting up status sync for interpreter ${interpreterId}`);
    
    // Clean up any existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    // Create a dedicated channel for this interpreter's status
    const statusChannel = supabase.channel(`interpreter-status-sync-${interpreterId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'interpreter_profiles',
        filter: `id=eq.${interpreterId}`
      }, (payload) => {
        console.log(`[useInterpreterStatusSync] Status change for ${interpreterId}:`, payload);
        
        if (payload.new && payload.new.status && onStatusChange) {
          const newStatus = payload.new.status as Profile['status'];
          console.log(`[useInterpreterStatusSync] Triggering status change to ${newStatus}`);
          onStatusChange(newStatus);
          
          // Emit a badge update event
          eventEmitter.emit(EVENT_INTERPRETER_BADGE_UPDATE, {
            interpreterId: interpreterId,
            status: newStatus
          });
        }
      })
      .subscribe(status => {
        console.log(`[useInterpreterStatusSync] Status channel subscription status for ${interpreterId}:`, status);
        
        if (status === 'CHANNEL_ERROR') {
          console.error(`[useInterpreterStatusSync] Channel error for ${interpreterId}, attempting recovery`);
          setTimeout(() => {
            if (channelRef.current) {
              channelRef.current.subscribe();
            }
          }, 5000);
        }
      });
    
    channelRef.current = statusChannel;
    
    // Listen for status update events
    const handleStatusUpdate = () => {
      console.log(`[useInterpreterStatusSync] Received status update event`);
      
      // Clear any pending verification timeout
      if (statusUpdateTimeoutRef.current) {
        clearTimeout(statusUpdateTimeoutRef.current);
      }
      
      // Set up verification timeout to fetch current status after an event
      statusUpdateTimeoutRef.current = setTimeout(async () => {
        try {
          const { data, error } = await supabase
            .from('interpreter_profiles')
            .select('status')
            .eq('id', interpreterId)
            .single();
            
          if (error) {
            console.error('[useInterpreterStatusSync] Error fetching status:', error);
            return;
          }
          
          if (data && data.status && onStatusChange) {
            console.log(`[useInterpreterStatusSync] Fetched status for ${interpreterId}:`, data.status);
            onStatusChange(data.status as Profile['status']);
          }
        } catch (err) {
          console.error('[useInterpreterStatusSync] Error in status verification:', err);
        }
        
        statusUpdateTimeoutRef.current = null;
      }, 1000);
    };
    
    eventEmitter.on(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);
    
    return () => {
      console.log(`[useInterpreterStatusSync] Cleaning up status sync for ${interpreterId}`);
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      if (statusUpdateTimeoutRef.current) {
        clearTimeout(statusUpdateTimeoutRef.current);
        statusUpdateTimeoutRef.current = null;
      }
      
      eventEmitter.off(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);
    };
  }, [interpreterId, onStatusChange, isAdmin]);
  
  const updateStatus = async (newStatus: Profile['status']): Promise<boolean> => {
    if (!interpreterId) return false;
    
    try {
      console.log(`[useInterpreterStatusSync] Updating status for ${interpreterId} to ${newStatus}`);
      
      const { error } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: interpreterId,
        p_status: newStatus
      });
      
      if (error) {
        console.error('[useInterpreterStatusSync] Error updating status:', error);
        return false;
      }
      
      console.log(`[useInterpreterStatusSync] Status updated successfully, emitting events`);
      eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE);
      
      // Also emit a specific badge update event
      eventEmitter.emit(EVENT_INTERPRETER_BADGE_UPDATE, {
        interpreterId: interpreterId,
        status: newStatus
      });
      
      // Verify the update after a delay
      statusUpdateTimeoutRef.current = setTimeout(async () => {
        try {
          const { data, error: verifyError } = await supabase
            .from('interpreter_profiles')
            .select('status')
            .eq('id', interpreterId)
            .single();
            
          if (verifyError) {
            console.error('[useInterpreterStatusSync] Verification error:', verifyError);
            return;
          }
          
          if (data && data.status !== newStatus) {
            console.warn(`[useInterpreterStatusSync] Status verification failed, expected ${newStatus} but got ${data.status}`);
            
            // Retry the update if verification fails
            const { error: retryError } = await supabase.rpc('update_interpreter_status', {
              p_interpreter_id: interpreterId,
              p_status: newStatus
            });
            
            if (!retryError) {
              console.log(`[useInterpreterStatusSync] Status update retry successful`);
              eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE);
            }
          }
        } catch (err) {
          console.error('[useInterpreterStatusSync] Error in verification:', err);
        }
        
        statusUpdateTimeoutRef.current = null;
      }, 1000);
      
      return true;
    } catch (error) {
      console.error('[useInterpreterStatusSync] Unexpected error:', error);
      return false;
    }
  };
  
  return {
    updateStatus
  };
};
