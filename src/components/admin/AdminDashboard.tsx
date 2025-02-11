import { useEffect, useState } from "react";
import { InterpreterCard } from "../InterpreterCard";
import { StatusFilter } from "../StatusFilter";
import { Input } from "@/components/ui/input";
import { Search, LogOut, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CountrySelect } from "../CountrySelect";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MissionManagement } from "./MissionManagement";
import { UserManagement } from "./UserManagement";
import { AdminGuideContent } from "./AdminGuideContent";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { MessagesTab } from "./MessagesTab";
import { LANGUAGES } from "@/lib/constants";

interface Interpreter {
  id: string;
  first_name: string;
  last_name: string;
  status: "available" | "unavailable" | "pause" | "busy";
  employment_status: "salaried_aft" | "salaried_aftcom" | "salaried_planet" | "self_employed" | "permanent_interpreter";
  languages: string[];
  phone_interpretation_rate: number | null;
  phone_number: string | null;
  birth_country: string | null;
  nationality: string | null;
  phone_interpretation_rate: number | null;
  siret_number: string | null;
  vat_number: string | null;
  profile_picture_url: string | null;
  next_mission_start: string | null;
  next_mission_duration: number | null;
  tarif_15min: number;
  tarif_5min: number;
}

export const AdminDashboard = () => {
  const [interpreters, setInterpreters] = useState<Interpreter[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [sourceLanguageFilter, setSourceLanguageFilter] = useState("all");
  const [targetLanguageFilter, setTargetLanguageFilter] = useState("all");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [birthCountryFilter, setBirthCountryFilter] = useState("all");
  const [employmentStatusFilter, setEmploymentStatusFilter] = useState<string>("all");
  const [rateSort, setRateSort] = useState<"none" | "asc" | "desc">("none");
  const { toast } = useToast();
  const navigate = useNavigate();

  const sortedLanguages = [...LANGUAGES].sort((a, b) => a.localeCompare(b));

  const resetAllFilters = () => {
    setSelectedStatus(null);
    setNameFilter("");
    setSourceLanguageFilter("all");
    setTargetLanguageFilter("all");
    setPhoneFilter("");
    setBirthCountryFilter("all");
    setEmploymentStatusFilter("all");

    toast({
      title: "Filtres réinitialisés",
      description: "Tous les filtres ont été réinitialisés",
    });
  };

  useEffect(() => {
    fetchInterpreters();
    subscribeToUpdates();
  }, []);

  const validateStatus = (status: string | null): "available" | "unavailable" | "pause" | "busy" => {
    const validStatuses = ["available", "unavailable", "pause", "busy"];
    return (status && validStatuses.includes(status) ? status : "unavailable") as Interpreter["status"];
  };

  const mapDatabaseToInterpreter = (data: any[]): Interpreter[] => {
    return data.map(item => ({
      id: item.id,
      first_name: item.first_name,
      last_name: item.last_name,
      status: validateStatus(item.status),
      employment_status: item.employment_status,
      languages: item.languages,
      phone_interpretation_rate: item.phone_interpretation_rate,
      phone_number: item.phone_number,
      birth_country: item.birth_country,
      nationality: item.nationality,
      phone_interpretation_rate: item.phone_interpretation_rate,
      siret_number: item.siret_number,
      vat_number: item.vat_number,
      profile_picture_url: item.profile_picture_url,
      next_mission_start: item.next_mission_start,
      next_mission_duration: item.next_mission_duration,
      tarif_15min: item.tarif_15min,
      tarif_5min: item.tarif_5min,
    }));
  };

  const fetchInterpreters = async () => {
    try {
      const { data, error } = await supabase
        .from("interpreters_with_next_mission")
        .select("*");

      if (error) throw error;
      setInterpreters(mapDatabaseToInterpreter(data || []));
    } catch (error) {
      console.error("Error fetching interpreters:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des interprètes",
        variant: "destructive",
      });
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel('interpreter-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interpreter_profiles'
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setInterpreters(prev => 
              prev.map(interpreter => 
                interpreter.id === payload.new.id 
                  ? { ...interpreter, ...mapDatabaseToInterpreter([payload.new])[0] }
                  : interpreter
              )
            );
            toast({
              title: "Mise à jour",
              description: `Le statut de ${payload.new.first_name} ${payload.new.last_name} a été mis à jour`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté avec succès",
      });
      
      navigate("/admin/login");
    } catch (error: any) {
      toast({
        title: "Erreur de déconnexion",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredInterpreters = interpreters.filter(interpreter => {
    const isNotAdmin = !(`${interpreter.first_name} ${interpreter.last_name}`.includes("Adlane Admin"));
    const matchesStatus = !selectedStatus || interpreter.status === selectedStatus;
    const matchesName = nameFilter === "" || 
      `${interpreter.first_name} ${interpreter.last_name}`
        .toLowerCase()
        .includes(nameFilter.toLowerCase());
    
    const matchesSourceLanguage = sourceLanguageFilter === "all" || 
      interpreter.languages.some(lang => {
        const [source] = lang.split(" → ");
        return source.toLowerCase().includes(sourceLanguageFilter.toLowerCase());
      });

    const matchesTargetLanguage = targetLanguageFilter === "all" || 
      interpreter.languages.some(lang => {
        const [, target] = lang.split(" → ");
        return target && target.toLowerCase().includes(targetLanguageFilter.toLowerCase());
      });

    const matchesPhone = phoneFilter === "" || 
      (interpreter.phone_number && 
       interpreter.phone_number.toLowerCase().includes(phoneFilter.toLowerCase()));

    const matchesBirthCountry = birthCountryFilter === "all" ||
      (interpreter.birth_country === birthCountryFilter);

    const matchesEmploymentStatus = employmentStatusFilter === "all" || 
      interpreter.employment_status === employmentStatusFilter;

    return isNotAdmin &&
           matchesStatus && 
           matchesName && 
           matchesSourceLanguage && 
           matchesTargetLanguage && 
           matchesPhone && 
           matchesBirthCountry &&
           matchesEmploymentStatus;
  });

  return (
    <>
      <div className="container mx-auto py-6">
        <Tabs defaultValue="interpreters" className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="interpreters">Interprètes</TabsTrigger>
              <TabsTrigger value="missions">Missions</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="users">Utilisateurs</TabsTrigger>
              <TabsTrigger value="guide">
                Guide d'utilisation
              </TabsTrigger>
            </TabsList>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </Button>
          </div>

          <TabsContent value="interpreters">
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Liste des interprètes</h2>
                <Button
                  variant="outline"
                  onClick={resetAllFilters}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Supprimer tous les filtres
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name-search">Nom</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="name-search"
                      placeholder="Rechercher par nom..."
                      className="pl-10"
                      value={nameFilter}
                      onChange={(e) => setNameFilter(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="source-language">Langue source</Label>
                  <Select value={sourceLanguageFilter} onValueChange={setSourceLanguageFilter}>
                    <SelectTrigger id="source-language">
                      <SelectValue placeholder="Sélectionner une langue source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les langues</SelectItem>
                      {sortedLanguages.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target-language">Langue cible</Label>
                  <Select value={targetLanguageFilter} onValueChange={setTargetLanguageFilter}>
                    <SelectTrigger id="target-language">
                      <SelectValue placeholder="Sélectionner une langue cible" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les langues</SelectItem>
                      {sortedLanguages.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone-search">Numéro de téléphone</Label>
                  <Input
                    id="phone-search"
                    placeholder="Rechercher par téléphone..."
                    value={phoneFilter}
                    onChange={(e) => setPhoneFilter(e.target.value)}
                  />
                </div>

                <CountrySelect
                  value={birthCountryFilter}
                  onValueChange={setBirthCountryFilter}
                  label="Pays de naissance"
                  placeholder="Sélectionner un pays"
                />

                <div className="space-y-2">
                  <Label htmlFor="employment-status">Statut professionnel</Label>
                  <Select
                    value={employmentStatusFilter}
                    onValueChange={setEmploymentStatusFilter}
                  >
                    <SelectTrigger id="employment-status">
                      <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="salaried_aft">Salarié AFTrad</SelectItem>
                      <SelectItem value="salaried_aftcom">Salarié AFTCOM</SelectItem>
                      <SelectItem value="salaried_planet">Salarié PLANET</SelectItem>
                      <SelectItem value="permanent_interpreter">Interprète permanent</SelectItem>
                      <SelectItem value="self_employed">Auto-entrepreneur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate-sort">Trier par tarif</Label>
                  <Select value={rateSort} onValueChange={setRateSort}>
                    <SelectTrigger id="rate-sort">
                      <SelectValue placeholder="Trier par tarif" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sans tri</SelectItem>
                      <SelectItem value="asc">Du moins cher au plus cher</SelectItem>
                      <SelectItem value="desc">Du plus cher au moins cher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <StatusFilter
                selectedStatus={selectedStatus}
                onStatusChange={setSelectedStatus}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredInterpreters
                  .sort((a, b) => {
                    if (rateSort === "none") return 0;
                    const aRate = a.tarif_15min || 0;
                    const bRate = b.tarif_15min || 0;
                    return rateSort === "asc" ? aRate - bRate : bRate - aRate;
                  })
                  .map((interpreter) => (
                    <InterpreterCard
                      key={interpreter.id}
                      interpreter={{
                        id: interpreter.id,
                        name: `${interpreter.first_name} ${interpreter.last_name}`,
                        status: interpreter.status || "unavailable",
                        employment_status: interpreter.employment_status,
                        languages: interpreter.languages,
                        tarif_15min: interpreter.tarif_15min,
                        tarif_5min: interpreter.tarif_5min,
                        phone_number: interpreter.phone_number,
                        next_mission_start: interpreter.next_mission_start,
                        next_mission_duration: interpreter.next_mission_duration,
                      }}
                    />
                  ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="missions">
            <MissionManagement />
          </TabsContent>

          <TabsContent value="messages">
            <MessagesTab />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="guide">
            <AdminGuideContent />
          </TabsContent>
        </Tabs>
      </div>
      
      <footer className="w-full py-4 mt-8 text-center text-sm text-gray-500 border-t">
        © {new Date().getFullYear()} AFTraduction. Tous droits réservés.
      </footer>
    </>
  );
};
