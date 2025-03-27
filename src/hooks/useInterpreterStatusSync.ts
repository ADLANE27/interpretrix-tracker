
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE } from '@/lib/events';
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
  
  useEffect(() => {
    if (!interpreterId) return;
    
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
        if (payload.new && payload.new.status && onStatusChange) {
          const newStatus = payload.new.status as Profile['status'];
          onStatusChange(newStatus);
        }
      })
      .subscribe();
    
    channelRef.current = statusChannel;
    
    // Listen for status update events
    const handleStatusUpdate = (data: { interpreterId: string, status: string }) => {
      if (data.interpreterId === interpreterId && onStatusChange) {
        onStatusChange(data.status as Profile['status']);
      }
    };
    
    eventEmitter.on(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      eventEmitter.off(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);
    };
  }, [interpreterId, onStatusChange, isAdmin]);
  
  const updateStatus = async (newStatus: Profile['status']): Promise<boolean> => {
    if (!interpreterId) return false;
    
    try {
      const { error } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: interpreterId,
        p_status: newStatus
      });
      
      if (error) {
        console.error('Error updating status:', error);
        return false;
      }
      
      // Emit a status update event to synchronize all components
      eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
        interpreterId: interpreterId,
        status: newStatus
      });
      
      return true;
    } catch (error) {
      console.error('Unexpected error:', error);
      return false;
    }
  };
  
  return {
    updateStatus
  };
};
