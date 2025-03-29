import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { LANGUAGES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isInterpreterAvailableForScheduledMission } from "@/utils/missionUtils";
import { Switch } from "@/components/ui/switch";
import { Search } from "lucide-react";
import { InterpreterSuggestionCard } from "../interpreter/InterpreterSuggestionCard";

const MissionManagement = () => {
  const [missionType, setMissionType] = useState("immediate");
  const [sourceLanguage, setSourceLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [commentary, setCommentary] = useState("");
  const [availableInterpreters, setAvailableInterpreters] = useState<any[]>([]);
  const [selectedInterpreter, setSelectedInterpreter] = useState<string | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [isStartTimeValid, setIsStartTimeValid] = useState(true);
  const [isEndTimeValid, setIsEndTimeValid] = useState(true);

  // Add a new state for interpreter search
  const [interpreterSearch, setInterpreterSearch] = useState("");
  const [filteredInterpreters, setFilteredInterpreters] = useState<any[]>([]);

  const validateTime = (time: string): boolean => {
    if (!time) return true;
    return !isNaN(new Date(time).getTime());
  };

  useEffect(() => {
    setIsStartTimeValid(validateTime(startTime));
  }, [startTime]);

  useEffect(() => {
    setIsEndTimeValid(validateTime(endTime));
  }, [endTime]);

  const handleCreateMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInterpreter || !sourceLanguage || !targetLanguage) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    if (missionType === "scheduled" && (!startTime || !endTime)) {
      toast({
        title: "Erreur",
        description: "Veuillez spécifier la date et l'heure de début et de fin de la mission",
        variant: "destructive",
      });
      return;
    }

    if (missionType === "scheduled" && (!isStartTimeValid || !isEndTimeValid)) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer une date et une heure valides",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      let missionData = {
        mission_type: missionType,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        commentary,
        created_by: user.id,
        is_urgent: isUrgent,
      };

      if (missionType === "immediate") {
        missionData = {
          ...missionData,
          status: "awaiting_acceptance",
          notified_interpreters: [selectedInterpreter],
        };
      } else if (missionType === "scheduled") {
        const isAvailable = await isInterpreterAvailableForScheduledMission(
          selectedInterpreter,
          startTime,
          endTime,
          supabase
        );

        if (!isAvailable) {
          toast({
            title: "Erreur",
            description: "L'interprète n'est pas disponible à cette heure",
            variant: "destructive",
          });
          return;
        }

        missionData = {
          ...missionData,
          scheduled_start_time: startTime,
          scheduled_end_time: endTime,
          assigned_interpreter_id: selectedInterpreter,
          status: "scheduled",
        };
      }

      const { error } = await supabase
        .from('interpretation_missions')
        .insert([missionData]);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "La mission a été créée avec succès",
      });

      setSourceLanguage("");
      setTargetLanguage("");
      setStartTime("");
      setEndTime("");
      setCommentary("");
      setSelectedInterpreter(null);
      setIsUrgent(false);

    } catch (error: any) {
      console.error("Error creating mission:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la mission",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update this function to sort interpreters alphabetically
  const findInterpreters = async (sourceLang: string, targetLang: string) => {
    if (!sourceLang || !targetLang) return;

    setIsLoading(true);
    try {
      const { data: interpreters, error } = await supabase
        .from("interpreter_profiles")
        .select(`
          id,
          first_name,
          last_name,
          status,
          profile_picture_url,
          languages,
          employment_status,
          tarif_5min,
          tarif_15min
        `);

      if (error) {
        console.error('Error fetching interpreters:', error);
        throw error;
      }

      const filteredInterpreters = interpreters?.filter(interpreter => {
        return interpreter.languages.some(lang => {
          const normalizedLang = lang.toLowerCase().replace(/\s+/g, '').replace(/[→⟶\->/]+/g, '→');
          const normalizedSourceLang = sourceLang.toLowerCase().replace(/\s+/g, '');
          const normalizedTargetLang = targetLang.toLowerCase().replace(/\s+/g, '');
          return normalizedLang === `${normalizedSourceLang}→${normalizedTargetLang}` || normalizedLang.includes(normalizedSourceLang) && normalizedLang.includes(normalizedTargetLang);
        });
      }) || [];

      // After fetching interpreters, sort them alphabetically
      if (interpreters && !error) {
        const sortedInterpreters = [...filteredInterpreters].sort((a, b) => {
          const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
          const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });

        setAvailableInterpreters(sortedInterpreters);
        setFilteredInterpreters(sortedInterpreters);
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de trouver les interprètes disponibles",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add a useEffect to filter interpreters based on search
  useEffect(() => {
    if (availableInterpreters.length > 0) {
      if (interpreterSearch.trim() === "") {
        setFilteredInterpreters(availableInterpreters);
        return;
      }

      const query = interpreterSearch.toLowerCase().trim();
      const filtered = availableInterpreters.filter(interpreter => {
        const fullName = `${interpreter.first_name} ${interpreter.last_name}`.toLowerCase();
        return fullName.includes(query);
      });

      setFilteredInterpreters(filtered);
    }
  }, [interpreterSearch, availableInterpreters]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Créer une nouvelle mission</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="immediate" className="space-y-4" onValueChange={setMissionType}>
            <TabsList>
              <TabsTrigger value="immediate">Immédiate</TabsTrigger>
              <TabsTrigger value="scheduled">Programmée</TabsTrigger>
            </TabsList>
            <form onSubmit={handleCreateMission} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="source_language">Langue source</Label>
                  <Select
                    value={sourceLanguage}
                    onValueChange={(value) => {
                      setSourceLanguage(value);
                      if (targetLanguage) {
                        findInterpreters(value, targetLanguage);
                      }
                    }}
                  >
                    <SelectTrigger className="bg-background">
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
                  <Select
                    value={targetLanguage}
                    onValueChange={(value) => {
                      setTargetLanguage(value);
                      if (sourceLanguage) {
                        findInterpreters(sourceLanguage, value);
                      }
                    }}
                  >
                    <SelectTrigger className="bg-background">
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

              <TabsContent value="immediate">
                <div className="space-y-2">
                  <Label htmlFor="is_urgent">Urgente</Label>
                  <Switch
                    id="is_urgent"
                    checked={isUrgent}
                    onCheckedChange={setIsUrgent}
                  />
                </div>

                {availableInterpreters.length > 0 ? (
                  <div className="my-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-lg">Interprètes disponibles</h3>
                      <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Rechercher un interprète..."
                          value={interpreterSearch}
                          onChange={(e) => setInterpreterSearch(e.target.value)}
                          className="pl-8 bg-background"
                        />
                      </div>
                    </div>

                    {filteredInterpreters.length === 0 ? (
                      <div className="text-center p-4 border border-dashed rounded-lg">
                        <p className="text-muted-foreground">Aucun interprète ne correspond à votre recherche</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {filteredInterpreters.map(interpreter => (
                          <InterpreterSuggestionCard
                            key={interpreter.id}
                            interpreter={interpreter}
                            isSelected={selectedInterpreter === interpreter.id}
                            onClick={() => setSelectedInterpreter(interpreter.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-4 border border-dashed rounded-lg">
                    <p className="text-muted-foreground">Aucun interprète disponible pour ces langues</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="scheduled">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Date et heure de début</Label>
                    <Input
                      type="datetime-local"
                      id="start_time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="bg-background"
                    />
                    {!isStartTimeValid && (
                      <p className="text-xs text-red-500">Date ou heure de début invalide</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_time">Date et heure de fin</Label>
                    <Input
                      type="datetime-local"
                      id="end_time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="bg-background"
                    />
                    {!isEndTimeValid && (
                      <p className="text-xs text-red-500">Date ou heure de fin invalide</p>
                    )}
                  </div>
                </div>

                {availableInterpreters.length > 0 ? (
                  <div className="my-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-lg">Interprètes disponibles</h3>
                      <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Rechercher un interprète..."
                          value={interpreterSearch}
                          onChange={(e) => setInterpreterSearch(e.target.value)}
                          className="pl-8 bg-background"
                        />
                      </div>
                    </div>

                    {filteredInterpreters.length === 0 ? (
                      <div className="text-center p-4 border border-dashed rounded-lg">
                        <p className="text-muted-foreground">Aucun interprète ne correspond à votre recherche</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {filteredInterpreters.map(interpreter => (
                          <InterpreterSuggestionCard
                            key={interpreter.id}
                            interpreter={interpreter}
                            isSelected={selectedInterpreter === interpreter.id}
                            onClick={() => setSelectedInterpreter(interpreter.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-4 border border-dashed rounded-lg">
                    <p className="text-muted-foreground">Aucun interprète disponible pour ces langues</p>
                  </div>
                )}
              </TabsContent>

              <div className="space-y-2">
                <Label htmlFor="commentary">Commentaire (optionnel)</Label>
                <Textarea
                  id="commentary"
                  value={commentary}
                  onChange={(e) => setCommentary(e.target.value)}
                  className="bg-background"
                  placeholder="Ajouter un commentaire..."
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !sourceLanguage || !targetLanguage || (missionType === "scheduled" && (!startTime || !endTime)) || !isStartTimeValid || !isEndTimeValid}
              >
                {isLoading ? "Création en cours..." : "Créer la mission"}
              </Button>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MissionManagement;
