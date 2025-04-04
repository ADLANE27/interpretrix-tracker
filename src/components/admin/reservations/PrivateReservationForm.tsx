
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { COMPANY_TYPES, LANGUAGES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CompanyType } from "@/types/privateReservation";
import { Search } from "lucide-react";
import { employmentStatusLabels } from "@/utils/employmentStatus";

interface Interpreter {
  id: string;
  first_name: string;
  last_name: string;
  languages: string[];
  status: string;
  profile_picture_url: string | null;
  employment_status: string;
  tarif_5min: number | null;
  tarif_15min: number | null;
}

export const PrivateReservationForm = () => {
  const [selectedInterpreter, setSelectedInterpreter] = useState<string | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [commentary, setCommentary] = useState("");
  const [company, setCompany] = useState<CompanyType>("AFTrad");
  const [availableInterpreters, setAvailableInterpreters] = useState<Interpreter[]>([]);
  const [filteredInterpreters, setFilteredInterpreters] = useState<Interpreter[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (availableInterpreters.length > 0) {
      if (searchQuery.trim() === "") {
        setFilteredInterpreters(availableInterpreters);
        return;
      }

      const query = searchQuery.toLowerCase().trim();
      const filtered = availableInterpreters.filter(interpreter => {
        const fullName = `${interpreter.first_name} ${interpreter.last_name}`.toLowerCase();
        return fullName.includes(query);
      });
      
      setFilteredInterpreters(filtered);
    }
  }, [searchQuery, availableInterpreters]);

  const normalizeLanguageString = (str: string): string => {
    return str.toLowerCase().replace(/\s+/g, '').replace(/[→⟶\->/]+/g, '→');
  };

  const doesLanguagePairMatch = (interpreterLang: string, sourceLang: string, targetLang: string): boolean => {
    const normalizedInterpreterLang = normalizeLanguageString(interpreterLang);
    const normalizedSourceLang = normalizeLanguageString(sourceLang);
    const normalizedTargetLang = normalizeLanguageString(targetLang);
    
    const directMatch = normalizedInterpreterLang === `${normalizedSourceLang}→${normalizedTargetLang}`;
    
    const includesMatch = normalizedInterpreterLang.includes(normalizedSourceLang) && 
                          normalizedInterpreterLang.includes(normalizedTargetLang);
    
    return directMatch || includesMatch;
  };

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
          languages,
          employment_status,
          tarif_5min,
          tarif_15min
        `);

      if (error) {
        console.error('[PrivateReservationForm] Erreur:', error);
        throw error;
      }

      interpreters?.forEach(interpreter => {
        console.log(`[PrivateReservationForm] Interprète ${interpreter.first_name} ${interpreter.last_name} languages:`, interpreter.languages);
      });

      const filteredInterpreters = interpreters?.filter(interpreter => {
        return interpreter.languages.some(lang => {
          const matches = doesLanguagePairMatch(lang, sourceLang, targetLang);
          console.log(`[PrivateReservationForm] Vérification de ${interpreter.first_name} ${interpreter.last_name}:`, {
            lang,
            sourceLang,
            targetLang,
            matches
          });
          return matches;
        });
      }) || [];

      // Sort interpreters alphabetically by first name and then last name
      const sortedInterpreters = [...filteredInterpreters].sort((a, b) => {
        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });

      console.log('[PrivateReservationForm] Interprètes trouvés et triés:', sortedInterpreters);
      setAvailableInterpreters(sortedInterpreters);
      setFilteredInterpreters(sortedInterpreters);
      setSelectedInterpreter(null);
      setSearchQuery("");

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
          company,
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
      setCompany("AFTrad");
      setAvailableInterpreters([]);
      setFilteredInterpreters([]);
      setSearchQuery("");

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
                {LANGUAGES.map((lang) => (
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

          <div className="space-y-2">
            <Label htmlFor="company">Entreprise</Label>
            <Select 
              value={company} 
              onValueChange={(value: CompanyType) => {
                setCompany(value);
              }}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Sélectionner une entreprise" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={COMPANY_TYPES.AFTRAD}>AFTrad</SelectItem>
                <SelectItem value={COMPANY_TYPES.AFTCOM}>AFTcom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {availableInterpreters.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Sélectionner un interprète</Label>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un interprète..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 bg-background"
                />
              </div>
            </div>
            
            {filteredInterpreters.length === 0 ? (
              <div className="text-center p-4 border border-dashed rounded-lg">
                <p className="text-muted-foreground">Aucun interprète ne correspond à votre recherche</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredInterpreters.map((interpreter) => (
                  <Card
                    key={interpreter.id}
                    className={`p-4 flex items-start space-x-4 hover:bg-gray-50 cursor-pointer ${
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
                    <div className="w-full">
                      <p className="font-medium">
                        {interpreter.first_name} {interpreter.last_name}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
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
                        
                        {/* Employment status badge */}
                        {interpreter.employment_status && (
                          <Badge variant="outline" className="text-xs bg-gray-50">
                            {employmentStatusLabels[interpreter.employment_status as keyof typeof employmentStatusLabels] || interpreter.employment_status}
                          </Badge>
                        )}
                      </div>

                      {/* Rate badges */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {interpreter.tarif_5min !== null && interpreter.tarif_5min > 0 && (
                          <Badge variant="outline" className="text-xs bg-gray-50">
                            5min: {interpreter.tarif_5min}€
                          </Badge>
                        )}
                        
                        {interpreter.tarif_15min !== null && interpreter.tarif_15min > 0 && (
                          <Badge variant="outline" className="text-xs bg-gray-50">
                            15min: {interpreter.tarif_15min}€
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
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
