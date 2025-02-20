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
import { parseISO, formatISO } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { Filter } from "lucide-react";
import { Mission } from "@/types/mission";

const sortedLanguages = [...LANGUAGES].sort((a, b) => a.localeCompare(b));

interface Interpreter {
  id: string;
  first_name: string;
  last_name: string;
  languages: string[];
  status: string;
  profile_picture_url: string | null;
  tarif_15min: number;
}

interface Creator {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export const MissionManagement = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [availableInterpreters, setAvailableInterpreters] = useState<Interpreter[]>([]);
  const [selectedInterpreters, setSelectedInterpreters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceLanguage, setSourceLanguage] = useState("Français");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [missionType, setMissionType] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledStartTime, setScheduledStartTime] = useState("");
  const [scheduledEndTime, setScheduledEndTime] = useState("");
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [missionTypeFilter, setMissionTypeFilter] = useState<'all' | 'immediate' | 'scheduled'>('all');
  const [languageFilter, setLanguageFilter] = useState<string>("");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [creatorFilter, setCreatorFilter] = useState<string>("all");
  const [creators, setCreators] = useState<Creator[]>([]);

  const fetchMissions = async () => {
    try {
      console.log('[MissionManagement] Fetching missions');
      const { data, error } = await supabase
        .from("mission_details")
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
    const cleanup = setupRealtimeSubscription();
    
    const fetchCreators = async () => {
      const { data, error } = await supabase
        .from('mission_creators')
        .select('*');
      
      if (error) {
        console.error('Error fetching creators:', error);
        return;
      }

      setCreators(data || []);
    };

    fetchCreators();
    
    // Cleanup function
    return () => {
      cleanup();
    };
  }, []);

  const setupRealtimeSubscription = () => {
    console.log('[MissionManagement] Setting up realtime subscription');
    
    // Create a single channel for all subscriptions
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
      .on(
        'postgres_changes',
        {
          event: '*',
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
        console.log('[MissionManagement] Subscription status:', status);
      });

    // Return cleanup function
    return () => {
      console.log('[MissionManagement] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  };

  useEffect(() => {
    fetchMissions();
    const cleanup = setupRealtimeSubscription();
    
    // Cleanup function
    return () => {
      cleanup();
    };
  }, []); // Only run once on mount

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
          languages,
          tarif_15min
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

      // Filter out duplicates based on interpreter ID and sort by rate
      const uniqueInterpreters = interpreters
        .filter((interpreter, index, self) =>
          index === self.findIndex((t) => t.id === interpreter.id)
        )
        .sort((a, b) => (a.tarif_15min ?? 0) - (b.tarif_15min ?? 0)); // Sort by rate, lowest first

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
      console.log('[MissionManagement] Already processing a request');
      return;
    }

    try {
      setIsProcessing(true);
      console.log('[MissionManagement] Starting mission creation process');
      
      // Validation checks
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

      // Scheduled mission validation
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

      // Immediate mission validation
      if (missionType === 'immediate' && (!estimatedDuration || parseInt(estimatedDuration) <= 0)) {
        toast({
          title: "Erreur de validation",
          description: "Veuillez spécifier une durée valide pour la mission",
          variant: "destructive",
        });
        return;
      }

      let calculatedDuration = parseInt(estimatedDuration);
      let utcStartTime = null;
      let utcEndTime = null;

      if (missionType === 'scheduled' && scheduledStartTime && scheduledEndTime) {
        utcStartTime = formatISO(fromZonedTime(scheduledStartTime, Intl.DateTimeFormat().resolvedOptions().timeZone));
        utcEndTime = formatISO(fromZonedTime(scheduledEndTime, Intl.DateTimeFormat().resolvedOptions().timeZone));
        calculatedDuration = Math.round(
          (new Date(scheduledEndTime).getTime() - new Date(scheduledStartTime).getTime()) / 1000 / 60
        );
      }

      console.log('[MissionManagement] Creating mission for interpreters:', selectedInterpreters);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour créer une mission",
          variant: "destructive",
        });
        return;
      }

      // Prepare mission data
      const missionData = {
        source_language: sourceLanguage,
        target_language: targetLanguage,
        estimated_duration: calculatedDuration,
        status: "awaiting_acceptance",
        notified_interpreters: selectedInterpreters,
        mission_type: missionType,
        scheduled_start_time: utcStartTime,
        scheduled_end_time: utcEndTime,
        created_by: user.id
      };

      console.log('[MissionManagement] Mission data:', missionData);

      // Create the mission with updated fields
      const { data: createdMission, error: missionError } = await supabase
        .from("interpretation_missions")
        .insert(missionData)
        .select();

      if (missionError) {
        console.error('[MissionManagement] Error creating mission:', missionError);
        throw missionError;
      }

      console.log('[MissionManagement] Mission created successfully:', createdMission);

      toast({
        title: "Mission créée avec succès",
        description: `La mission ${missionType === 'scheduled' ? 'programmée' : 'immédiate'} a été créée et les interprètes seront notifiés`,
      });
      
      // Reset form
      setSourceLanguage("");
      setTargetLanguage("");
      setEstimatedDuration("");
      setSelectedInterpreters([]);
      setAvailableInterpreters([]);
      setMissionType('immediate');
      setScheduledStartTime("");
      setScheduledEndTime("");

      fetchMissions();

    } catch (error) {
      console.error('[MissionManagement] Error in createMission:', error);
      toast({
        title: "Erreur lors de la création",
        description: "Une erreur est survenue lors de la création de la mission. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMissionResponse = async (missionId: string, accept: boolean) => {
    if (isProcessing) {
      console.log('[MissionManagement] Already processing a request');
      return;
    }

    try {
      setIsProcessing(true);
      console.log(`[MissionManagement] Processing mission response: ${accept ? 'accept' : 'decline'} for mission ${missionId}`);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[MissionManagement] No user found');
        throw new Error("Non authentifié");
      }

      if (accept) {
        console.log('[MissionManagement] Calling handle_mission_acceptance RPC');
        const { error: updateError } = await supabase.rpc('handle_mission_acceptance', {
          p_mission_id: missionId,
          p_interpreter_id: user.id
        });

        if (updateError) {
          console.error('[MissionManagement] Error in handle_mission_acceptance:', updateError);
          if (updateError.message.includes('Interpreter is not available')) {
            throw new Error("Vous n'êtes plus disponible pour accepter des missions");
          } else if (updateError.message.includes('Mission is no longer available')) {
            throw new Error("Cette mission n'est plus disponible");
          }
          throw updateError;
        }

        console.log('[MissionManagement] Mission accepted successfully');
      } else {
        console.log('[MissionManagement] Declining mission');
        const { error: declineError } = await supabase
          .from('interpretation_missions')
          .update({ 
            status: 'declined',
            notified_interpreters: [user.id]
          })
          .eq('id', missionId);

        if (declineError) {
          console.error('[MissionManagement] Error declining mission:', declineError);
          throw declineError;
        }

        setMissions(prevMissions => prevMissions.filter(m => m.id !== missionId));
        console.log('[MissionManagement] Mission declined successfully');
      }

      fetchMissions();
    } catch (error: any) {
      console.error('[MissionManagement] Error updating mission:', error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredMissions = missions.filter(mission => {
    // Filter by status
    if (statusFilter !== 'all' && mission.status !== statusFilter) {
      return false;
    }

    // Filter by mission type
    if (missionTypeFilter !== 'all' && mission.mission_type !== missionTypeFilter) {
      return false;
    }

    // Filter by creator
    if (creatorFilter !== 'all' && mission.creator_email !== creatorFilter) {
      return false;
    }

    // Filter by language
    if (languageFilter && !`${mission.source_language} → ${mission.target_language}`.includes(languageFilter)) {
      return false;
    }

    // Filter by date range
    if (startDateFilter && mission.scheduled_start_time && new Date(mission.scheduled_start_time) < new Date(startDateFilter)) {
      return false;
    }
    if (endDateFilter && mission.scheduled_start_time && new Date(mission.scheduled_start_time) > new Date(endDateFilter)) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Créer une nouvelle mission</h3>
        <form onSubmit={createMission} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type de mission</Label>
              <Select value={missionType} onValueChange={(value: 'immediate' | 'scheduled') => setMissionType(value)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Sélectionner le type de mission" className="pointer-events-none" />
                </SelectTrigger>
                <SelectContent className="bg-background">
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
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source_language">Langue source</Label>
                  <Select value={sourceLanguage} onValueChange={setSourceLanguage} required>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Sélectionner une langue" className="pointer-events-none" />
                    </SelectTrigger>
                    <SelectContent className="bg-background max-h-[300px]">
                      {sortedLanguages.map((lang) => (
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
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Sélectionner une langue" className="pointer-events-none" />
                    </SelectTrigger>
                    <SelectContent className="bg-background max-h-[300px]">
                      {sortedLanguages.map((lang) => (
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
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Sélectionner une langue" className="pointer-events-none" />
                      </SelectTrigger>
                      <SelectContent className="bg-background max-h-[300px]">
                        {sortedLanguages.map((lang) => (
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
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Sélectionner une langue" className="pointer-events-none" />
                      </SelectTrigger>
                      <SelectContent className="bg-background max-h-[300px]">
                        {sortedLanguages.map((lang) => (
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

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Liste des missions</h3>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtres
              {(statusFilter !== 'all' || missionTypeFilter !== 'all' || languageFilter || startDateFilter || endDateFilter || creatorFilter !== 'all') && (
                <Badge variant="secondary" className="ml-2">Actifs</Badge>
              )}
            </Button>
          </div>

          {showFilters && (
            <Card className="p-4 mb-4 bg-muted/50">
              <div className="grid gap-4">
                <div className="flex flex-wrap gap-4">
                  <div className="w-[200px]">
                    <Label className="mb-2">Type de mission</Label>
                    <Select 
                      value={missionTypeFilter} 
                      onValueChange={(value: 'all' | 'immediate' | 'scheduled') => setMissionTypeFilter(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Filtrer par type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="immediate">Immédiate</SelectItem>
                        <SelectItem value="scheduled">Programmée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-[200px]">
                    <Label className="mb-2">Statut</Label>
                    <Select 
                      value={statusFilter} 
                      onValueChange={(value: string) => setStatusFilter(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Filtrer par statut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="awaiting_acceptance">En attente</SelectItem>
                        <SelectItem value="accepted">Acceptée</SelectItem>
                        <SelectItem value="declined">Refusée</SelectItem>
                        <SelectItem value="cancelled">Annulée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-[200px]">
                    <Label className="mb-2">Langues</Label>
                    <Input
                      type="text"
                      placeholder="Filtrer par langues"
                      value={languageFilter}
                      onChange={(e) => setLanguageFilter(e.target.value)}
                    />
                  </div>

                  <div className="w-[200px]">
                    <Label className="mb-2">Date de début</Label>
                    <Input
                      type="date"
                      value={startDateFilter}
                      onChange={(e) => setStartDateFilter(e.target.value)}
                    />
                  </div>

                  <div className="w-[200px]">
                    <Label className="mb-2">Date de fin</Label>
                    <Input
                      type="date"
                      value={endDateFilter}
                      onChange={(e) => setEndDateFilter(e.target.value)}
                    />
                  </div>

                  <div className="w-[200px]">
                    <Label className="mb-2">Créateur</Label>
                    <Select 
                      value={creatorFilter} 
                      onValueChange={setCreatorFilter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Filtrer par créateur" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        {creators.map((creator) => (
                          <SelectItem key={creator.id} value={creator.email}>
                            {creator.first_name} {creator.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-fit"
                  onClick={() => {
                    setStatusFilter('all');
                    setMissionTypeFilter('all');
                    setLanguageFilter('');
                    setStartDateFilter('');
                    setEndDateFilter('');
                    setCreatorFilter('all');
                  }}
                >
                  Réinitialiser les filtres
                </Button>
              </div>
            </Card>
          )}

          <MissionList
            missions={filteredMissions}
            onDelete={handleDeleteMission}
            onMissionResponse={handleMissionResponse}
          />
        </div>
      </Card>
    </div>
  );
};
