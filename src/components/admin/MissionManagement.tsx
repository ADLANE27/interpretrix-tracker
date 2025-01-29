import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LANGUAGES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";

interface Mission {
  id: string;
  source_language: string;
  target_language: string;
  estimated_duration: number;
  status: string;
  created_at: string;
  assigned_interpreter_id?: string;
}

interface Interpreter {
  id: string;
  first_name: string;
  last_name: string;
  languages: string[];
  status: string;
  profile_picture_url: string | null;
}

export const MissionManagement = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [availableInterpreters, setAvailableInterpreters] = useState<Interpreter[]>([]);
  const [selectedInterpreters, setSelectedInterpreters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
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

  const findAvailableInterpreters = async (sourceLang: string, targetLang: string) => {
    if (!sourceLang || !targetLang) return;
    
    try {
      const languagePair = `${sourceLang} → ${targetLang}`;
      const { data, error } = await supabase
        .from("interpreter_profiles")
        .select("id, first_name, last_name, languages, status, profile_picture_url")
        .eq("status", "available")
        .contains("languages", [languagePair]);

      if (error) throw error;
      setAvailableInterpreters(data || []);
      setSelectedInterpreters([]); // Reset selections when interpreters list changes
    } catch (error) {
      console.error("Error finding interpreters:", error);
      toast({
        title: "Erreur",
        description: "Impossible de trouver les interprètes disponibles",
        variant: "destructive",
      });
    }
  };

  const handleInterpreterSelection = (interpreterId: string) => {
    setSelectedInterpreters(prev => {
      if (prev.includes(interpreterId)) {
        return prev.filter(id => id !== interpreterId);
      } else {
        return [...prev, interpreterId];
      }
    });
  };

  const createMission = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedInterpreters.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins un interprète",
        variant: "destructive",
      });
      return;
    }

    try {
      // Set notification expiry to 24 hours from now
      const notificationExpiry = new Date();
      notificationExpiry.setHours(notificationExpiry.getHours() + 24);

      const { data: missionData, error: missionError } = await supabase
        .from("interpretation_missions")
        .insert({
          source_language: sourceLanguage,
          target_language: targetLanguage,
          estimated_duration: parseInt(estimatedDuration),
          status: "awaiting_acceptance",
          notification_expiry: notificationExpiry.toISOString(),
          notified_interpreters: selectedInterpreters
        })
        .select()
        .single();

      if (missionError) throw missionError;

      // Create notifications for each selected interpreter
      const notifications = selectedInterpreters.map(interpreter => ({
        mission_id: missionData.id,
        interpreter_id: interpreter,
        status: "pending"
      }));

      const { error: notificationError } = await supabase
        .from("mission_notifications")
        .insert(notifications);

      if (notificationError) throw notificationError;

      toast({
        title: "Succès",
        description: "La mission a été créée et les interprètes ont été notifiés",
      });

      // Reset form
      setSourceLanguage("");
      setTargetLanguage("");
      setEstimatedDuration("");
      setSelectedInterpreters([]);
      setAvailableInterpreters([]);
      
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

  // Only run findAvailableInterpreters when both languages are selected
  useEffect(() => {
    if (sourceLanguage && targetLanguage) {
      findAvailableInterpreters(sourceLanguage, targetLanguage);
    }
  }, [sourceLanguage, targetLanguage]);

  // Set up real-time subscription for mission status updates
  useEffect(() => {
    fetchMissions();

    const channel = supabase
      .channel('mission-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interpretation_missions'
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            fetchMissions(); // Refresh missions list when updates occur
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Créer une nouvelle mission</h3>
        <form onSubmit={createMission} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {availableInterpreters.length > 0 && (
            <div className="space-y-2">
              <Label>Interprètes disponibles ({availableInterpreters.length})</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableInterpreters.map((interpreter) => (
                  <Card 
                    key={interpreter.id} 
                    className={`p-4 flex items-center space-x-4 cursor-pointer hover:bg-gray-50 ${
                      selectedInterpreters.includes(interpreter.id) ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleInterpreterSelection(interpreter.id)}
                  >
                    <Checkbox
                      checked={selectedInterpreters.includes(interpreter.id)}
                      onCheckedChange={() => handleInterpreterSelection(interpreter.id)}
                    />
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={interpreter.profile_picture_url || undefined} />
                      <AvatarFallback>
                        {interpreter.first_name[0]}{interpreter.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {interpreter.first_name} {interpreter.last_name}
                      </p>
                      <Badge variant="secondary">Disponible</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full"
            disabled={selectedInterpreters.length === 0}
          >
            Créer la mission et notifier les interprètes
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
                  <p className="text-sm text-gray-600">
                    {mission.source_language} → {mission.target_language}
                  </p>
                  <p className="text-sm text-gray-600">
                    Durée estimée: {mission.estimated_duration} minutes
                  </p>
                  <Badge 
                    variant={mission.status === "confirmed" ? "default" : "secondary"}
                    className="mt-2"
                  >
                    {mission.status === "awaiting_acceptance" 
                      ? "En attente d'acceptation" 
                      : mission.status === "confirmed" 
                        ? "Confirmée" 
                        : mission.status}
                  </Badge>
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