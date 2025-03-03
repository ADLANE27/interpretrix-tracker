
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LANGUAGES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Interpreter {
  id: string;
  first_name: string;
  last_name: string;
  languages: string[];
  status: string;
  profile_picture_url: string | null;
}

export const PrivateReservationForm = () => {
  const [selectedInterpreter, setSelectedInterpreter] = useState<string | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [commentary, setCommentary] = useState("");
  const [availableInterpreters, setAvailableInterpreters] = useState<Interpreter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const findAvailableInterpreters = async (sourceLang: string, targetLang: string) => {
    if (!sourceLang || !targetLang) return;
    
    try {
      console.log('[PrivateReservationForm] Recherche des interprètes pour les langues:', { sourceLang, targetLang });
      
      const { data: interpreters, error } = await supabase
        .from("interpreter_profiles")
        .select(`
          id,
          first_name,
          last_name,
          status,
          profile_picture_url,
          languages
        `)
        .eq('status', 'available');

      if (error) {
        console.error('[PrivateReservationForm] Erreur:', error);
        throw error;
      }

      const languagePair = `${sourceLang} → ${targetLang}`;
      console.log('[PrivateReservationForm] Recherche de la paire de langues:', languagePair);

      // Debug: log all interpreters and their language pairs
      interpreters?.forEach(interpreter => {
        console.log(`[PrivateReservationForm] Interprète ${interpreter.first_name} ${interpreter.last_name} languages:`, interpreter.languages);
      });

      const filteredInterpreters = interpreters?.filter(interpreter => {
        const hasLanguagePair = interpreter.languages.some(lang => lang === languagePair);
        console.log(`[PrivateReservationForm] Vérification de ${interpreter.first_name} ${interpreter.last_name} pour ${languagePair}:`, hasLanguagePair);
        return hasLanguagePair;
      }) || [];

      console.log('[PrivateReservationForm] Interprètes trouvés:', filteredInterpreters);
      setAvailableInterpreters(filteredInterpreters);
      setSelectedInterpreter(null);

    } catch (error) {
      console.error('[PrivateReservationForm] Erreur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de trouver les interprètes disponibles",
        variant: "destructive",
      });
    }
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInterpreter || !startTime || !endTime || !sourceLanguage || !targetLanguage) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from('private_reservations')
        .insert({
          interpreter_id: selectedInterpreter,
          source_language: sourceLanguage,
          target_language: targetLanguage,
          start_time: startTime,
          end_time: endTime,
          duration_minutes: durationMinutes,
          commentary,
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "La réservation a été créée avec succès",
      });

      setSelectedInterpreter(null);
      setSourceLanguage("");
      setTargetLanguage("");
      setStartTime("");
      setEndTime("");
      setCommentary("");
      setAvailableInterpreters([]);

    } catch (error: any) {
      console.error('[PrivateReservationForm] Error creating reservation:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la réservation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Créer une nouvelle réservation</h3>
      <form onSubmit={handleCreateReservation} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="source_language">Langue source</Label>
            <Select 
              value={sourceLanguage} 
              onValueChange={(value) => {
                console.log('[PrivateReservationForm] Langue source sélectionnée:', value);
                setSourceLanguage(value);
                if (targetLanguage) {
                  findAvailableInterpreters(value, targetLanguage);
                }
              }}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Sélectionner une langue" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(LANGUAGES).map((lang) => (
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
                console.log('[PrivateReservationForm] Langue cible sélectionnée:', value);
                setTargetLanguage(value);
                if (sourceLanguage) {
                  findAvailableInterpreters(sourceLanguage, value);
                }
              }}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Sélectionner une langue" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(LANGUAGES).map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_time">Date et heure de début</Label>
            <Input
              type="datetime-local"
              id="start_time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end_time">Date et heure de fin</Label>
            <Input
              type="datetime-local"
              id="end_time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              min={startTime}
              className="bg-background"
            />
          </div>
        </div>

        {availableInterpreters.length > 0 && (
          <div className="space-y-2">
            <Label>Sélectionner un interprète</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableInterpreters.map((interpreter) => (
                <Card
                  key={interpreter.id}
                  className={`p-4 flex items-center space-x-4 hover:bg-gray-50 cursor-pointer ${
                    selectedInterpreter === interpreter.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedInterpreter(interpreter.id)}
                >
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
                </Card>
              ))}
            </div>
          </div>
        )}

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
          disabled={isLoading || !selectedInterpreter || !startTime || !endTime || !sourceLanguage || !targetLanguage}
        >
          {isLoading ? "Création en cours..." : "Créer la réservation"}
        </Button>
      </form>
    </Card>
  );
};
