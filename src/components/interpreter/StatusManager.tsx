
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types/profile";
import { StatusButtons } from "./StatusButtons";

interface StatusManagerProps {
  currentStatus?: Profile['status'];
  onStatusChange?: (newStatus: Profile['status']) => Promise<void>;
  className?: string;
}

export const StatusManager = ({ currentStatus, onStatusChange, className = "" }: StatusManagerProps = {}) => {
  const [status, setStatus] = useState<Profile['status']>(currentStatus || "available");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  // Update local state when prop changes
  useEffect(() => {
    if (currentStatus && currentStatus !== status) {
      setStatus(currentStatus);
    }
  }, [currentStatus]);

  // Get current user ID and set up real-time subscription
  useEffect(() => {
    const setupSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('[StatusManager] No authenticated user found');
          return;
        }

        setUserId(user.id);

        // Set up real-time subscription only after we have the user ID
        const channel = supabase.channel('interpreter-status')
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'interpreter_profiles',
            filter: `id=eq.${user.id}`
          }, payload => {
            console.log('[StatusManager] Status update received:', payload);
            const newStatus = payload.new.status;
            if (isValidStatus(newStatus)) {
              setStatus(newStatus);
            }
          })
          .subscribe(status => {
            console.log('[StatusManager] Subscription status:', status);
          });

        return () => {
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.error('[StatusManager] Error setting up subscription:', error);
      }
    };

    setupSubscription();
  }, []);

  const isValidStatus = (status: string): status is Profile['status'] => {
    return ['available', 'unavailable', 'pause', 'busy'].includes(status);
  };

  const handleStatusChange = async (newStatus: Profile['status']) => {
    if (status === newStatus || !userId || isLoading) return;
    
    setIsLoading(true);
    try {
      console.log('[StatusManager] Attempting status update for user:', userId);
      
      const { error } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: userId,
        p_status: newStatus as string
      });

      if (error) {
        console.error('[StatusManager] Database error:', error);
        throw error;
      }

      console.log('[StatusManager] Status update successful');

      if (onStatusChange) {
        await onStatusChange(newStatus);
      }

      setStatus(newStatus);
      toast({
        title: "Statut mis à jour",
        description: `Votre statut est maintenant "${getStatusLabel(newStatus)}"`,
      });
    } catch (error: any) {
      console.error('[StatusManager] Error updating status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour votre statut",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusLabel = (status: Profile['status']): string => {
    switch (status) {
      case "available": return "Disponible";
      case "busy": return "En appel";
      case "pause": return "En pause";
      case "unavailable": return "Indisponible";
      default: return "Inconnu";
    }
  };

  return (
    <StatusButtons 
      currentStatus={status}
      onStatusChange={handleStatusChange}
      isLoading={isLoading}
      className={className}
    />
  );
};
