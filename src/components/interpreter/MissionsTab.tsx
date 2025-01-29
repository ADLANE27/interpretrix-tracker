import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckSquare, XSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Mission {
  id: string;
  client_name: string;
  date: string;
  duration: string;
  source_language: string;
  target_language: string;
  status: 'pending' | 'accepted' | 'declined';
  rate: number;
}

export const MissionsTab = () => {
  const [missions] = useState<Mission[]>([
    {
      id: "1",
      client_name: "Client A",
      date: "2024-03-20",
      duration: "1h",
      source_language: "Français",
      target_language: "Anglais",
      status: "pending",
      rate: 50
    },
    // Add more mock missions as needed
  ]);
  const { toast } = useToast();

  const handleMissionResponse = async (missionId: string, accept: boolean) => {
    try {
      // TODO: Implement actual mission acceptance/decline logic with Supabase
      toast({
        title: accept ? "Mission acceptée" : "Mission déclinée",
        description: `La mission a été ${accept ? 'acceptée' : 'déclinée'} avec succès.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du traitement de votre demande.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Propositions de missions</h2>
      {missions.map((mission) => (
        <Card key={mission.id} className="p-4">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <h3 className="font-semibold">{mission.client_name}</h3>
              <div className="text-sm text-gray-600">
                <p>Date: {mission.date}</p>
                <p>Durée: {mission.duration}</p>
                <p>Langues: {mission.source_language} → {mission.target_language}</p>
                <p>Tarif: {mission.rate}€/heure</p>
              </div>
            </div>
            {mission.status === 'pending' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => handleMissionResponse(mission.id, true)}
                >
                  <CheckSquare className="h-4 w-4" />
                  Accepter
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => handleMissionResponse(mission.id, false)}
                >
                  <XSquare className="h-4 w-4" />
                  Décliner
                </Button>
              </div>
            )}
            {mission.status !== 'pending' && (
              <Badge variant={mission.status === 'accepted' ? 'default' : 'secondary'}>
                {mission.status === 'accepted' ? 'Acceptée' : 'Déclinée'}
              </Badge>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};