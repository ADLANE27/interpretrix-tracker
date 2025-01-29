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
import { Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Mission {
  id: string;
  source_language: string;
  target_language: string;
  estimated_duration: number;
  status: string;
  created_at: string;
  assigned_interpreter_id?: string;
  assigned_interpreter?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture_url: string | null;
    status: string;
  };
  notified_interpreters: string[];
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
        .select(`
          *,
          assigned_interpreter:interpreter_profiles!interpretation_missions_assigned_interpreter_id_fkey (
            id,
            first_name,
            last_name,
            profile_picture_url,
            status
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      console.log("Fetched missions:", data);
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

  const setupRealtimeSubscription = () => {
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
          console.log('Realtime update received:', payload);
          fetchMissions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mission_notifications'
        },
        (payload) => {
          console.log('Notification update received:', payload);
          fetchMissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const handleInterpreterSelection = (interpreterId: string, checked: boolean) => {
    setSelectedInterpreters(prev => {
      if (checked) {
        return [...prev, interpreterId];
      } else {
        return prev.filter(id => id !== interpreterId);
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

      setSourceLanguage("");
      setTargetLanguage("");
      setEstimatedDuration("");
      setSelectedInterpreters([]);
      setAvailableInterpreters([]);
      
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

  const handleDeleteMission = async (missionId: string) => {
    try {
      // First, delete related notifications
      const { error: notificationError } = await supabase
        .from("mission_notifications")
        .delete()
        .eq("mission_id", missionId);

      if (notificationError) throw notificationError;

      // Then delete the mission
      const { error } = await supabase
        .from("interpretation_missions")
        .delete()
        .eq("id", missionId);

      if (error) throw error;

      toast({
        title: "Mission supprimée",
        description: "La mission a été supprimée avec succès",
      });

      fetchMissions();
    } catch (error) {
      console.error("Error deleting mission:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la mission",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchMissions();
    const cleanup = setupRealtimeSubscription();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (sourceLanguage && targetLanguage) {
      findAvailableInterpreters(sourceLanguage, targetLanguage);
    }
  }, [sourceLanguage, targetLanguage]);

  // ... keep existing code (JSX rendering part remains the same)

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
                    className={`p-4 flex items-center space-x-4 hover:bg-gray-50 ${
                      selectedInterpreters.includes(interpreter.id) ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <Checkbox
                      checked={selectedInterpreters.includes(interpreter.id)}
                      onCheckedChange={(checked) => handleInterpreterSelection(interpreter.id, checked as boolean)}
                      className="pointer-events-auto"
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
                    variant={mission.status === "accepted" ? "default" : "secondary"}
                    className="mt-2"
                  >
                    {mission.status === "awaiting_acceptance" 
                      ? "En attente d'acceptation" 
                      : mission.status === "accepted" 
                        ? "Acceptée" 
                        : mission.status}
                  </Badge>
                  {mission.assigned_interpreter && (
                    <div className="mt-2 flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={mission.assigned_interpreter.profile_picture_url || undefined} />
                        <AvatarFallback>
                          {mission.assigned_interpreter.first_name[0]}
                          {mission.assigned_interpreter.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-600">
                        Mission acceptée par {mission.assigned_interpreter.first_name} {mission.assigned_interpreter.last_name}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm text-gray-600">
                    {new Date(mission.created_at).toLocaleDateString()}
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer la mission</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir supprimer cette mission ? Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDeleteMission(mission.id)}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
};
