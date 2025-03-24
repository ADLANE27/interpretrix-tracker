
import { supabase } from "@/integrations/supabase/client";
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATED } from '@/lib/events';
import { Profile } from "@/types/profile";

type Status = Profile['status'];

/**
 * Update an interpreter's status using the standardized approach.
 * This function:
 * 1. Calls the RPC function to update the status
 * 2. Emits the status update event
 * 
 * @param interpreterId - The ID of the interpreter
 * @param newStatus - The new status to set
 * @param previousStatus - The previous status (optional)
 * @returns Promise with the result of the operation
 */
export const updateInterpreterStatus = async (
  interpreterId: string, 
  newStatus: Status,
  previousStatus?: Status
): Promise<{ success: boolean; error?: any }> => {
  try {
    console.log(`[statusUpdates] Updating status for ${interpreterId} to ${newStatus}`);
    
    // Call the standardized RPC function
    const { error } = await supabase.rpc('update_interpreter_status', {
      p_interpreter_id: interpreterId,
      p_status: newStatus
    });

    if (error) {
      console.error('[statusUpdates] Error updating status:', error);
      throw error;
    }
    
    // Emit the status update event
    eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATED, {
      interpreterId,
      status: newStatus,
      previousStatus
    });
    
    return { success: true };
  } catch (error) {
    console.error('[statusUpdates] Error in updateInterpreterStatus:', error);
    return { success: false, error };
  }
};
