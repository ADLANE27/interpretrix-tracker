import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LANGUAGES } from "@/lib/constants";

interface Mission {
  id: string;
  client_name: string;
  source_language: string;
  target_language: string;
  estimated_duration: number;
  status: string;
  created_at: string;
  assigned_interpreter_id?: string;
}

export const MissionManagement = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const { toast } = useToast();

  const fetchMissions = async () => {
    try {
      const { data, error } = await supabase
        .from("interpretation_missions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMissions(data || []);
    } catch (error) {
      console.error("Error fetching missions:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les missions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createMission = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Set notification expiry to 24 hours from now
      const notificationExpiry = new Date();
      notificationExpiry.setHours(notificationExpiry.getHours() + 24);

      const { error } = await supabase
        .from("interpretation_missions")
        .insert({
          client_name: clientName,
          source_language: sourceLanguage,
          target_language: targetLanguage,
          estimated_duration: parseInt(estimatedDuration),
          notification_expiry: notificationExpiry.toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "La mission a été créée avec succès",
      });

      // Reset form
      setClientName("");
      setSourceLanguage("");
      setTargetLanguage("");
      setEstimatedDuration("");
      
      // Refresh missions list
      fetchMissions();
    } catch (error) {
      console.error("Error creating mission:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la mission",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Créer une nouvelle mission</h3>
        <form onSubmit={createMission} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_name">Nom du client</Label>
              <Input
                id="client_name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source_language">Langue source</Label>
              <Select value={sourceLanguage} onValueChange={setSourceLanguage} required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une langue" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_language">Langue cible</Label>
              <Select value={targetLanguage} onValueChange={setTargetLanguage} required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une langue" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_duration">Durée estimée (minutes)</Label>
              <Input
                id="estimated_duration"
                type="number"
                min="1"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full">
            Créer la mission
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Liste des missions</h3>
        <div className="space-y-4">
          {missions.map((mission) => (
            <Card key={mission.id} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">{mission.client_name}</h4>
                  <p className="text-sm text-gray-600">
                    {mission.source_language} → {mission.target_language}
                  </p>
                  <p className="text-sm text-gray-600">
                    Durée estimée: {mission.estimated_duration} minutes
                  </p>
                  <p className="text-sm text-gray-600">
                    Statut: {mission.status}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    {new Date(mission.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
};