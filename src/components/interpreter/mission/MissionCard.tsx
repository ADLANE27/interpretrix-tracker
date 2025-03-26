
import { Card } from "@/components/ui/card";
import { Mission } from "@/types/mission";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MissionDetails } from "./MissionDetails";
import { MissionStatus } from "./MissionStatus";
import { MissionActions } from "./MissionActions";

interface MissionCardProps {
  mission: Mission;
  currentUserId: string | null;
  isProcessing: boolean;
  onMissionResponse: (missionId: string, accept: boolean) => Promise<void>;
  onDelete?: (missionId: string) => Promise<void>;
  showAdminControls?: boolean;
}

export const MissionCard = ({ 
  mission, 
  currentUserId, 
  isProcessing, 
  onMissionResponse,
  onDelete,
  showAdminControls = false 
}: MissionCardProps) => {
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('interpretation_missions')
        .delete()
        .eq('id', mission.id);

      if (error) throw error;

      toast({
        title: "Mission supprimée",
        description: "La mission a été supprimée avec succès"
      });

      if (onDelete) {
        await onDelete(mission.id);
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la suppression",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="p-4">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <MissionDetails mission={mission} currentUserId={currentUserId} />
            <MissionStatus 
              status={mission.status} 
              assignedInterpreterId={mission.assigned_interpreter_id} 
              currentUserId={currentUserId} 
            />
          </div>
        </div>
        <MissionActions 
          mission={mission}
          isProcessing={isProcessing}
          showAdminControls={showAdminControls}
          onMissionResponse={onMissionResponse}
          onDelete={handleDelete}
        />
      </div>
    </Card>
  );
};
