
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

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

        if (error) throw error;

        setStatus(newStatus);
        toast({
          title: "Statut mis à jour",
          description: `Votre statut est maintenant ${newStatus}`,
        });
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

  const statusConfig = {
    available: {
      color: "bg-interpreter-available hover:bg-interpreter-available/90",
      label: "Disponible"
    },
    busy: {
      color: "bg-interpreter-busy hover:bg-interpreter-busy/90",
      label: "En appel"
    },
    pause: {
      color: "bg-interpreter-pause hover:bg-interpreter-pause/90",
      label: "En pause"
    },
    unavailable: {
      color: "bg-interpreter-unavailable hover:bg-interpreter-unavailable/90",
      label: "Indisponible"
    }
  };

  return (
    <motion.div 
      className="flex flex-wrap items-center gap-2 mx-auto max-w-full overflow-x-auto hide-scrollbar"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {(Object.keys(statusConfig) as Status[]).map((statusKey) => (
        <motion.div
          key={statusKey}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="shrink-0"
        >
          <Button
            variant={status === statusKey ? "default" : "outline"}
            size="sm"
            onClick={() => handleStatusChange(statusKey)}
            disabled={isLoading}
            className={`
              transition-all duration-200 whitespace-nowrap min-w-[90px]
              ${status === statusKey ? statusConfig[statusKey].color : ''}
              ${status === statusKey ? 'shadow-lg' : ''}
            `}
          >
            {statusConfig[statusKey].label}
          </Button>
        </motion.div>
      ))}
    </motion.div>
  );
};
