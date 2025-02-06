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
import { MissionList } from "./mission/MissionList";
import { hasTimeOverlap, isInterpreterAvailableForScheduledMission } from "@/utils/missionUtils";

// Sort languages alphabetically
const sortedLanguages = [...LANGUAGES].sort((a, b) => a.localeCompare(b));

interface Mission {
  id: string;
  source_language: string;
  target_language: string;
  estimated_duration: number;
  status: string;
  created_at: string;
  assigned_interpreter_id?: string;
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  mission_type: 'immediate' | 'scheduled';
  interpreter_profiles?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture_url: string | null;
    status: string;
  };
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
  const [missionType, setMissionType] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledStartTime, setScheduledStartTime] = useState("");
  const [scheduledEndTime, setScheduledEndTime] = useState("");
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchMissions = async () => {
    try {
      console.log('[MissionManagement] Fetching missions');
      const { data, error } = await supabase
        .from("interpretation_missions")
        .select(`
          *,
          interpreter_profiles!interpretation_missions_assigned_interpreter_id_fkey (
            id,
            first_name,
            last_name,
            profile_picture_url,
            status
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      console.log('[MissionManagement] Missions fetched successfully:', data);
      setMissions(data as Mission[]);
      setLoading(false);
    } catch (error) {
      console.error('[MissionManagement] Error fetching missions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les missions",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissions();
  }, []);

  const handleSelectAllInterpreters = () => {
    if (selectedInterpreters.length === availableInterpreters.length) {
      setSelectedInterpreters([]);
    } else {
      setSelectedInterpreters(availableInterpreters.map(interpreter => interpreter.id));
    }
  };

  const findAvailableInterpreters = async (sourceLang: string, targetLang: string) => {
    if (!sourceLang || !targetLang) return;
    
    try {
      console.log('[MissionManagement] Finding interpreters for languages:', { sourceLang, targetLang });
      
      const query = supabase
        .from("interpreter_profiles")
        .select(`
          id,
          first_name,
          last_name,
          status,
          profile_picture_url,
          languages
        `)
        .contains('languages', [`${sourceLang} → ${targetLang}`]);

      // Only filter by status for immediate missions
      if (missionType === 'immediate') {
        query.eq('status', 'available');
      }

      const { data: interpreters, error } = await query;

      if (error) {
        console.error('[MissionManagement] Error fetching interpreters:', error);
        throw error;
      }

      console.log('[MissionManagement] Found interpreters:', interpreters);
      
      if (!interpreters || interpreters.length === 0) {
        console.log('[MissionManagement] No interpreters found for languages:', { sourceLang, targetLang });
        toast({
          title: "Aucun interprète trouvé",
          description: `Aucun interprète ${missionType === 'immediate' ? 'disponible' : 'trouvé'} pour la combinaison ${sourceLang} → ${targetLang}`,
        });
        setAvailableInterpreters([]);
        return;
      }

      // Filter out duplicates based on interpreter ID
      const uniqueInterpreters = interpreters.filter((interpreter, index, self) =>
        index === self.findIndex((t) => t.id === interpreter.id)
      );

      setAvailableInterpreters(uniqueInterpreters);
      setSelectedInterpreters([]);
    } catch (error) {
      console.error('[MissionManagement] Error in findAvailableInterpreters:', error);
      toast({
        title: "Erreur",
        description: "Impossible de trouver les interprètes disponibles",
        variant: "destructive",
      });
      setAvailableInterpreters([]);
    }
  };

  useEffect(() => {
    if (sourceLanguage && targetLanguage) {
      findAvailableInterpreters(sourceLanguage, targetLanguage);
    }
  }, [sourceLanguage, targetLanguage]);

  const handleInterpreterSelection = async (interpreterId: string, checked: boolean) => {
    if (missionType === 'scheduled' && scheduledStartTime && scheduledEndTime) {
      const isAvailable = await isInterpreterAvailableForScheduledMission(
        interpreterId,
        scheduledStartTime,
        scheduledEndTime,
        supabase
      );

      if (!isAvailable && checked) {
        toast({
          title: "Conflit d'horaire",
          description: "Cet interprète a déjà une mission programmée qui chevauche cet horaire",
          variant: "destructive",
        });
        return;
      }
    }

    setSelectedInterpreters(prev => {
      if (checked) {
        return [...prev, interpreterId];
      } else {
        return prev.filter(id => id !== interpreterId);
      }
    });
  };

  const handleDeleteMission = async (missionId: string) => {
    try {
      const { error: notificationError } = await supabase
        .from("mission_notifications")
        .delete()
        .eq("mission_id", missionId);

      if (notificationError) throw notificationError;

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
      console.error('[MissionManagement] Error deleting mission:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la mission",
        variant: "destructive",
      });
    }
  };

  const createMission = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isProcessing) {
      toast({
        title: "Action en cours",
        description: "Une mission est déjà en cours de création",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);
      
      if (selectedInterpreters.length === 0) {
        toast({
          title: "Erreur de validation",
          description: "Veuillez sélectionner au moins un interprète",
          variant: "destructive",
        });
        return;
      }

      if (!sourceLanguage || !targetLanguage) {
        toast({
          title: "Erreur de validation",
          description: "Veuillez sélectionner les langues source et cible",
          variant: "destructive",
        });
        return;
      }

      if (missionType === 'scheduled') {
        if (!scheduledStartTime || !scheduledEndTime) {
          toast({
            title: "Erreur de validation",
            description: "Veuillez spécifier les horaires de la mission programmée",
            variant: "destructive",
          });
          return;
        }

        const startDate = new Date(scheduledStartTime);
        const endDate = new Date(scheduledEndTime);
        const now = new Date();

        if (startDate < now) {
          toast({
            title: "Erreur de validation",
            description: "La date de début ne peut pas être dans le passé",
            variant: "destructive",
          });
          return;
        }

        if (endDate <= startDate) {
          toast({
            title: "Erreur de validation",
            description: "La date de fin doit être postérieure à la date de début",
            variant: "destructive",
          });
          return;
        }
      }

      if (missionType === 'immediate' && (!estimatedDuration || parseInt(estimatedDuration) <= 0)) {
        toast({
          title: "Erreur de validation",
          description: "Veuillez spécifier une durée valide pour la mission",
          variant: "destructive",
        });
        return;
      }

      let calculatedDuration = parseInt(estimatedDuration);
      if (missionType === 'scheduled' && scheduledStartTime && scheduledEndTime) {
        calculatedDuration = Math.round(
          (new Date(scheduledEndTime).getTime() - new Date(scheduledStartTime).getTime()) / 1000 / 60
        );
      }

      const notificationExpiry = new Date();
      notificationExpiry.setHours(notificationExpiry.getHours() + 24);

      const newMissionData = {
        source_language: sourceLanguage,
        target_language: targetLanguage,
        estimated_duration: calculatedDuration,
        status: "awaiting_acceptance",
        notification_expiry: notificationExpiry.toISOString(),
        notified_interpreters: selectedInterpreters,
        mission_type: missionType,
        scheduled_start_time: missionType === 'scheduled' ? scheduledStartTime : null,
        scheduled_end_time: missionType === 'scheduled' ? scheduledEndTime : null
      };

      console.log('[MissionManagement] Creating new mission with data:', newMissionData);

      const { data: createdMission, error: missionError } = await supabase
        .from("interpretation_missions")
        .insert(newMissionData)
        .select()
        .single();

      if (missionError) throw missionError;

      console.log('[MissionManagement] Mission created successfully:', createdMission);

      const notifications = selectedInterpreters.map(interpreter => ({
        mission_id: createdMission.id,
        interpreter_id: interpreter,
        status: "pending"
      }));

      const { error: notificationError } = await supabase
        .from("mission_notifications")
        .insert(notifications);

      if (notificationError) throw notificationError;

      console.log('[MissionManagement] Notifications created successfully');

      setSourceLanguage("");
      setTargetLanguage("");
      setEstimatedDuration("");
      setSelectedInterpreters([]);
      setAvailableInterpreters([]);
      setMissionType('immediate');
      setScheduledStartTime("");
      setScheduledEndTime("");

      toast({
        title: "Mission créée avec succès",
        description: `La mission ${missionType === 'scheduled' ? 'programmée' : 'immédiate'} a été créée et les interprètes ont été notifiés`,
      });

      fetchMissions();

    } catch (error) {
      console.error('[MissionManagement] Error in createMission:', error);
      toast({
        title: "Erreur inattendue",
        description: error instanceof Error ? error.message : "Une erreur inattendue est survenue lors de la création de la mission",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Set up realtime subscription for missions
  useEffect(() => {
    const channel = supabase
      .channel('admin-missions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interpretation_missions'
        },
        () => {
          console.log('[MissionManagement] Received mission update, refreshing...');
          fetchMissions();
        }
      )
      .subscribe((status) => {
        console.log('[MissionManagement] Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Set up realtime subscription for interpreter status changes
  useEffect(() => {
    const channel = supabase
      .channel('interpreter-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'interpreter_profiles'
        },
        () => {
          console.log('[MissionManagement] Interpreter status changed, refreshing available interpreters...');
          if (sourceLanguage && targetLanguage) {
            findAvailableInterpreters(sourceLanguage, targetLanguage);
          }
        }
      )
      .subscribe((status) => {
        console.log('[MissionManagement] Interpreter status subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sourceLanguage, targetLanguage]);

  return (
    <div className="space-y-6">
      {/* Mission Creation Form */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Créer une nouvelle mission</h3>
        <form onSubmit={createMission} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type de mission</Label>
              <Select value={missionType} onValueChange={(value: 'immediate' | 'scheduled') => setMissionType(value)}>
                <SelectTrigger className="bg-background cursor-default">
                  <SelectValue placeholder="Sélectionner le type de mission" className="pointer-events-none" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="immediate" className="cursor-default">Immédiate</SelectItem>
                  <SelectItem value="scheduled" className="cursor-default">Programmée</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {missionType === 'immediate' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="estimated_duration">Durée estimée (minutes)</Label>
                  <Input
                    id="estimated_duration"
                    type="number"
                    min="1"
                    value={estimatedDuration}
                    onChange={(e) => setEstimatedDuration(e.target.value)}
                    required
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source_language">Langue source</Label>
                  <Select value={sourceLanguage} onValueChange={setSourceLanguage} required>
                    <SelectTrigger className="bg-background cursor-default">
                      <SelectValue placeholder="Sélectionner une langue" className="pointer-events-none" />
                    </SelectTrigger>
                    <SelectContent className="bg-background max-h-[300px]">
                      {sortedLanguages.map((lang) => (
                        <SelectItem key={lang} value={lang} className="cursor-default">
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_language">Langue cible</Label>
                  <Select value={targetLanguage} onValueChange={setTargetLanguage} required>
                    <SelectTrigger className="bg-background cursor-default">
                      <SelectValue placeholder="Sélectionner une langue" className="pointer-events-none" />
                    </SelectTrigger>
                    <SelectContent className="bg-background max-h-[300px]">
                      {sortedLanguages.map((lang) => (
                        <SelectItem key={lang} value={lang} className="cursor-default">
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduled_start">Date et heure de début</Label>
                    <Input
                      id="scheduled_start"
                      type="datetime-local"
                      value={scheduledStartTime}
                      onChange={(e) => setScheduledStartTime(e.target.value)}
                      required
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduled_end">Date et heure de fin</Label>
                    <Input
                      id="scheduled_end"
                      type="datetime-local"
                      value={scheduledEndTime}
                      onChange={(e) => setScheduledEndTime(e.target.value)}
                      required
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source_language">Langue source</Label>
                    <Select value={sourceLanguage} onValueChange={setSourceLanguage} required>
                      <SelectTrigger className="bg-background cursor-default">
                        <SelectValue placeholder="Sélectionner une langue" className="pointer-events-none" />
                      </SelectTrigger>
                      <SelectContent className="bg-background max-h-[300px]">
                        {sortedLanguages.map((lang) => (
                          <SelectItem key={lang} value={lang} className="cursor-default">
                            {lang}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target_language">Langue cible</Label>
                    <Select value={targetLanguage} onValueChange={setTargetLanguage} required>
                      <SelectTrigger className="bg-background cursor-default">
                        <SelectValue placeholder="Sélectionner une langue" className="pointer-events-none" />
                      </SelectTrigger>
                      <SelectContent className="bg-background max-h-[300px]">
                        {sortedLanguages.map((lang) => (
                          <SelectItem key={lang} value={lang} className="cursor-default">
                            {lang}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
          </div>

          {availableInterpreters.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>
                  {missionType === 'immediate' 
                    ? `Interprètes disponibles (${availableInterpreters.length})`
                    : `Interprètes (${availableInterpreters.length})`
                  }
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSelectAllInterpreters}
                  className="text-sm"
                >
                  {selectedInterpreters.length === availableInterpreters.length
                    ? "Désélectionner tout"
                    : "Sélectionner tout"}
                </Button>
              </div>
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
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="secondary" 
                          className={
                            interpreter.status === 'available'
                              ? 'bg-green-100 text-green-800'
                              : interpreter.status === 'busy'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {interpreter.status === 'available' 
                            ? 'Disponible' 
                            : interpreter.status === 'busy'
                            ? 'En appel'
                            : 'Indisponible'
                          }
                        </Badge>
                      </div>
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

      {/* Mission List */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Liste des missions</h3>
          </div>

          <MissionList
            missions={missions}
            onDelete={handleDeleteMission}
          />
        </div>
      </Card>
    </div>
  );
};
