
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { NotificationManager } from '../notifications/NotificationManager';

type Status = "available" | "unavailable" | "pause" | "busy";

interface StatusManagerProps {
  currentStatus?: Status;
  onStatusChange?: (newStatus: Status) => Promise<void>;
}

export const StatusManager = ({ currentStatus, onStatusChange }: StatusManagerProps = {}) => {
  const [status, setStatus] = useState<Status>(currentStatus || "available");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!onStatusChange) {
      const fetchStatus = async () => {
        setIsLoading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          const { data: profile, error } = await supabase
            .from('interpreter_profiles')
            .select('status')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('Error fetching status:', error);
            toast({
              title: "Erreur",
              description: "Impossible de récupérer votre statut actuel",
              variant: "destructive",
            });
          } else if (profile?.status) {
            setStatus(profile.status as Status);
          }
        } catch (error) {
          console.error('Error fetching status:', error);
          toast({
            title: "Erreur",
            description: "Impossible de récupérer votre statut actuel",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      };

      fetchStatus();
    }
  }, [toast, onStatusChange]);

  useEffect(() => {
    if (currentStatus && currentStatus !== status) {
      setStatus(currentStatus);
    }
  }, [currentStatus]);

  const handleStatusChange = async (newStatus: Status) => {
    setIsLoading(true);
    try {
      if (onStatusChange) {
        await onStatusChange(newStatus);
        setStatus(newStatus);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
          .from('interpreter_profiles')
          .update({ status: newStatus })
          .eq('id', user.id);

        if (error) {
          console.error('Error updating status:', error);
          toast({
            title: "Erreur",
            description: "Impossible de mettre à jour votre statut",
            variant: "destructive",
          });
        } else {
          setStatus(newStatus);
          toast({
            title: "Statut mis à jour",
            description: `Votre statut est maintenant ${newStatus}`,
          });
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour votre statut",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex justify-between items-center gap-4 mb-4">
      <div className="flex items-center gap-4">
        <Button
          variant={status === 'available' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleStatusChange('available')}
          disabled={isLoading}
          className={status === 'available' ? 'bg-interpreter-available hover:bg-interpreter-available/90' : ''}
        >
          Disponible
        </Button>
        <Button
          variant={status === 'unavailable' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleStatusChange('unavailable')}
          disabled={isLoading}
          className={status === 'unavailable' ? 'bg-interpreter-unavailable hover:bg-interpreter-unavailable/90' : ''}
        >
          Indisponible
        </Button>
        <Button
          variant={status === 'pause' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleStatusChange('pause')}
          disabled={isLoading}
          className={status === 'pause' ? 'bg-interpreter-pause hover:bg-interpreter-pause/90' : ''}
        >
          En pause
        </Button>
      </div>
      <div className="flex items-center gap-4">
        <NotificationManager />
      </div>
    </div>
  );
};

