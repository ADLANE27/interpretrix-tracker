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
import { MissionFilters, FilterOptions } from "./mission/MissionFilters";
import { MissionList } from "./mission/MissionList";
import { hasTimeOverlap, isInterpreterAvailableForScheduledMission, isInterpreterAvailableForImmediateMission } from "@/utils/missionUtils";

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
  const [filters, setFilters] = useState<FilterOptions>({
    search: "",
    status: "",
    missionType: "",
    dateRange: {
      start: "",
      end: "",
    },
  });

  const fetchMissions = async () => {
    try {
      console.log('[MissionManagement] Fetching missions with filters:', filters);
      let query = supabase
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
        `);

      // Apply filters
      if (filters.search) {
        query = query.or(`
          source_language.ilike.%${filters.search}%,
          target_language.ilike.%${filters.search}%,
          interpreter_profiles.first_name.ilike.%${filters.search}%,
          interpreter_profiles.last_name.ilike.%${filters.search}%
        `);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.missionType) {
        query = query.eq('mission_type', filters.missionType);
      }

      if (filters.dateRange.start) {
        query = query.gte('created_at', filters.dateRange.start);
      }

      if (filters.dateRange.end) {
        query = query.lte('created_at', filters.dateRange.end);
      }

      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('[MissionManagement] Error fetching missions:', error);
        throw error;
      }
      
      console.log('[MissionManagement] Missions fetched successfully:', data);
      setMissions(data as Mission[]);
    } catch (error) {
      console.error('[MissionManagement] Error in fetchMissions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les missions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissions();
  }, [filters]);

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
      console.log('[MissionManagement] Finding available interpreters for:', sourceLang, targetLang);
      const languagePair = `${sourceLang} → ${targetLang}`;
      
      const { data: potentialInterpreters, error } = await supabase
        .from("interpreter_profiles")
        .select("*")
        .contains("languages", [languagePair]);

      if (error) {
        console.error('[MissionManagement] Error fetching interpreters:', error);
        throw error;
      }

      console.log('[MissionManagement] Found potential interpreters:', potentialInterpreters);

      if (missionType === 'immediate') {
        const { data: scheduledMissions } = await supabase
          .from("interpretation_missions")
          .select("*")
          .eq("mission_type", "scheduled")
          .eq("status", "accepted");

        const availableInterpreters = potentialInterpreters?.filter(interpreter =>
          interpreter.status === 'available' &&
          isInterpreterAvailableForImmediateMission(interpreter, scheduledMissions || [])
        );

        console.log('[MissionManagement] Filtered available interpreters:', availableInterpreters);
        setAvailableInterpreters(availableInterpreters || []);
      } else {
        setAvailableInterpreters(potentialInterpreters || []);
      }

      setSelectedInterpreters([]);
    } catch (error) {
      console.error('[MissionManagement] Error in findAvailableInterpreters:', error);
      toast({
        title: "Erreur",
        description: "Impossible de trouver les interprètes disponibles",
        variant: "destructive",
      });
    }
  };

  const handleInterpreterSelection = async (interpreterId: string, checked: boolean) => {
    console.log('[MissionManagement] Handling interpreter selection:', interpreterId, checked);
    
    if (missionType === 'scheduled' && scheduledStartTime && scheduledEndTime) {
      const isAvailable = await isInterpreterAvailableForScheduledMission(
        interpreterId,
        scheduledStartTime,
        scheduledEndTime,
        supabase
      );

      if (!isAvailable && checked) {
        console.log('[MissionManagement] Interpreter has scheduling conflict');
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
      console.log('[MissionManagement] Deleting mission:', missionId);
      
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

      console.log('[MissionManagement] Mission deleted successfully');
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

  const handleResetFilters = () => {
    setFilters({
      search: "",
      status: "",
      missionType: "",
      dateRange: {
        start: "",
        end: "",
      },
    });
  };

  const createMission = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[MissionManagement] Starting mission creation process...');
    
    if (isProcessing) {
      console.log('[MissionManagement] Already processing a request');
      toast({
        title: "Action en cours",
        description: "Une mission est déjà en cours de création",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);
      
      // Validation checks with specific error messages
      if (selectedInterpreters.length === 0) {
        console.log('[MissionManagement] No interpreters selected');
        toast({
          title: "Erreur de validation",
          description: "Veuillez sélectionner au moins un interprète",
          variant: "destructive",
        });
        return;
      }

      if (!sourceLanguage || !targetLanguage) {
        console.log('[MissionManagement] Missing language selection');
        toast({
          title: "Erreur de validation",
          description: "Veuillez sélectionner les langues source et cible",
          variant: "destructive",
        });
        return;
      }

      if (missionType === 'scheduled') {
        if (!scheduledStartTime || !scheduledEndTime) {
          console.log('[MissionManagement] Missing scheduled times');
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
          console.log('[MissionManagement] Start time is in the past');
          toast({
            title: "Erreur de validation",
            description: "La date de début ne peut pas être dans le passé",
            variant: "destructive",
          });
          return;
        }

        if (endDate <= startDate) {
          console.log('[MissionManagement] Invalid time range');
          toast({
            title: "Erreur de validation",
            description: "La date de fin doit être postérieure à la date de début",
            variant: "destructive",
          });
          return;
        }
      }

      if (missionType === 'immediate' && (!estimatedDuration || parseInt(estimatedDuration) <= 0)) {
        console.log('[MissionManagement] Invalid duration');
        toast({
          title: "Erreur de validation",
          description: "Veuillez spécifier une durée valide pour la mission",
          variant: "destructive",
        });
        return;
      }

      // Calculate duration with proper validation
      let calculatedDuration = parseInt(estimatedDuration);
      if (missionType === 'scheduled' && scheduledStartTime && scheduledEndTime) {
        calculatedDuration = Math.round(
          (new Date(scheduledEndTime).getTime() - new Date(scheduledStartTime).getTime()) / 1000 / 60
        );
        
        if (calculatedDuration <= 0) {
          console.log('[MissionManagement] Invalid duration calculated');
          toast({
            title: "Erreur de validation",
            description: "La durée calculée de la mission n'est pas valide",
            variant: "destructive",
          });
          return;
        }
      }

      // Verify interpreter availability with detailed error messages
      for (const interpreterId of selectedInterpreters) {
        if (missionType === 'scheduled') {
          const isAvailable = await isInterpreterAvailableForScheduledMission(
            interpreterId,
            scheduledStartTime,
            scheduledEndTime,
            supabase
          );

          if (!isAvailable) {
            const interpreter = availableInterpreters.find(i => i.id === interpreterId);
            console.log(`[MissionManagement] Interpreter ${interpreterId} has a scheduling conflict`);
            toast({
              title: "Conflit d'horaire détecté",
              description: `L'interprète ${interpreter?.first_name} ${interpreter?.last_name} a un conflit d'horaire`,
              variant: "destructive",
            });
            return;
          }
        } else {
          const { data: interpreter } = await supabase
            .from('interpreter_profiles')
            .select('status, first_name, last_name')
            .eq('id', interpreterId)
            .single();

          if (!interpreter || interpreter.status !== 'available') {
            console.log(`[MissionManagement] Interpreter ${interpreterId} is no longer available`);
            toast({
              title: "Interprète non disponible",
              description: `L'interprète ${interpreter?.first_name} ${interpreter?.last_name} n'est plus disponible`,
              variant: "destructive",
            });
            return;
          }
        }
      }

      // Prepare mission data with proper validation
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

      // Create mission with error handling
      const { data: createdMission, error: missionError } = await supabase
        .from("interpretation_missions")
        .insert(newMissionData)
        .select()
        .single();

      if (missionError) {
        console.error('[MissionManagement] Error creating mission:', missionError);
        toast({
          title: "Erreur lors de la création",
          description: "Une erreur est survenue lors de la création de la mission",
          variant: "destructive",
        });
        return;
      }

      console.log('[MissionManagement] Mission created successfully:', createdMission);

      // Create notifications with error handling
      const notifications = selectedInterpreters.map(interpreter => ({
        mission_id: createdMission.id,
        interpreter_id: interpreter,
        status: "pending"
      }));

      const { error: notificationError } = await supabase
        .from("mission_notifications")
        .insert(notifications);

      if (notificationError) {
        console.error('[MissionManagement] Error creating notifications:', notificationError);
        toast({
          title: "Erreur lors de la notification",
          description: "Les interprètes n'ont pas pu être notifiés",
          variant: "destructive",
        });
        // Don't return here, we still want to clean up the form
      }

      console.log('[MissionManagement] Notifications created successfully');

      // Reset form
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

      // Refresh missions list
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
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type de mission" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immédiate</SelectItem>
                  <SelectItem value="scheduled">Programmée</SelectItem>
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

          <MissionFilters
            filters={filters}
            onFilterChange={setFilters}
            onReset={handleResetFilters}
          />

          <MissionList
            missions={missions}
            onDelete={handleDeleteMission}
          />
        </div>
      </Card>
    </div>
  );
};