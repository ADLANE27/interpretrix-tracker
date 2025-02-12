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
import { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";

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
  next_mission_start: string | null;
  next_mission_duration: number | null;
  tarif_15min: number | null;
  tarif_5min: number | null;
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
  const [rateSort, setRateSort] = useState<string>("none");
  const { toast } = useToast();
  const navigate = useNavigate();

  const sortedLanguages = [...LANGUAGES].sort((a, b) => a.localeCompare(b));

  const fetchInterpreters = async () => {
    try {
      console.log("[AdminDashboard] Fetching interpreters data");
      const { data, error } = await supabase
        .from("interpreters_with_next_mission")
        .select("*");

      if (error) throw error;

      const mappedInterpreters: Interpreter[] = (data || []).map(interpreter => ({
        id: interpreter.id || "",
        first_name: interpreter.first_name || "",
        last_name: interpreter.last_name || "",
        status: interpreter.status as "available" | "unavailable" | "pause" | "busy" || "unavailable",
        employment_status: interpreter.employment_status || "salaried_aft",
        languages: interpreter.languages || [],
        phone_interpretation_rate: interpreter.phone_interpretation_rate,
        phone_number: interpreter.phone_number,
        birth_country: interpreter.birth_country,
        next_mission_start: interpreter.next_mission_start,
        next_mission_duration: interpreter.next_mission_duration,
        tarif_15min: interpreter.tarif_15min,
        tarif_5min: null
      }));

      setInterpreters(mappedInterpreters);
      console.log("[AdminDashboard] Interpreters data updated:", mappedInterpreters.length, "records");
    } catch (error) {
      console.error("[AdminDashboard] Error fetching interpreters:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des interprètes",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    console.log("[AdminDashboard] Setting up real-time subscriptions");
    let isSubscribed = true;
    const channels: RealtimeChannel[] = [];
    let reconnectTimeout: NodeJS.Timeout;
    let lastFetchTimestamp = Date.now();

    const setupChannel = (channelName: string, table: string) => {
      const channel = supabase.channel(`admin-${channelName}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table
          },
          async (payload) => {
            if (!isSubscribed) return;
            console.log(`[AdminDashboard] ${table} changed:`, payload);
            
            const now = Date.now();
            if (now - lastFetchTimestamp > 1000) {
              lastFetchTimestamp = now;
              await fetchInterpreters();
            }
          }
        )
        .subscribe((status) => {
          console.log(`[AdminDashboard] ${channelName} subscription status:`, status);
        });

      channels.push(channel);
      return channel;
    };

    const handleConnectionState = () => {
      const hasActiveChannels = channels.some(channel => 
        channel.state === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED || 
        channel.state === REALTIME_SUBSCRIBE_STATES.JOINING
      );
      
      if (!hasActiveChannels && isSubscribed) {
        console.log("[AdminDashboard] No active channels detected, attempting to reconnect...");
        channels.forEach(channel => {
          if (channel.state !== REALTIME_SUBSCRIBE_STATES.SUBSCRIBED && 
              channel.state !== REALTIME_SUBSCRIBE_STATES.JOINING) {
            channel.subscribe();
          }
        });
      }
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log("[AdminDashboard] Tab became visible, refreshing all data");
        const now = Date.now();
        if (now - lastFetchTimestamp > 1000) {
          lastFetchTimestamp = now;
          await fetchInterpreters();
        }
      }
    };

    setupChannel('interpreter-profiles', 'interpreter_profiles');
    setupChannel('missions', 'interpretation_missions');
    setupChannel('user-roles', 'user_roles');
    setupChannel('mission-notifications', 'mission_notifications');
    setupChannel('chat-messages', 'chat_messages');
    setupChannel('message-mentions', 'message_mentions');
    setupChannel('channel-members', 'channel_members');

    document.addEventListener('visibilitychange', handleVisibilityChange);
    const connectionCheckInterval = setInterval(handleConnectionState, 30000);

    fetchInterpreters();

    return () => {
      console.log("[AdminDashboard] Cleaning up subscriptions and listeners");
      isSubscribed = false;
      clearInterval(connectionCheckInterval);
      clearTimeout(reconnectTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, []);

  const resetAllFilters = () => {
    setSelectedStatus(null);
    setNameFilter("");
    setSourceLanguageFilter("all");
    setTargetLanguageFilter("all");
    setPhoneFilter("");
    setBirthCountryFilter("all");
    setEmploymentStatusFilter("all");
    setRateSort("none");

    toast({
      title: "Filtres réinitialisés",
      description: "Tous les filtres ont été réinitialisés",
    });
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

  const filteredInterpreters = interpreters
    .filter(interpreter => {
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
    })
    .sort((a, b) => {
      if (rateSort === "rate-asc") {
        const rateA = (a.tarif_15min ?? 0);
        const rateB = (b.tarif_15min ?? 0);
        return rateA - rateB;
      }
      return 0;
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
              <TabsTrigger value="guide">Guide d'utilisation</TabsTrigger>
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
                      <SelectItem value="none">Pas de tri</SelectItem>
                      <SelectItem value="rate-asc">Du moins cher au plus cher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <StatusFilter
                selectedStatus={selectedStatus}
                onStatusChange={setSelectedStatus}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {interpreters
                  .filter(interpreter => {
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

                    return matchesStatus && 
                           matchesName && 
                           matchesSourceLanguage && 
                           matchesTargetLanguage && 
                           matchesPhone && 
                           matchesBirthCountry &&
                           matchesEmploymentStatus;
                  })
                  .sort((a, b) => {
                    if (rateSort === "rate-asc") {
                      const rateA = (a.tarif_15min ?? 0);
                      const rateB = (b.tarif_15min ?? 0);
                      return rateA - rateB;
                    }
                    return 0;
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
