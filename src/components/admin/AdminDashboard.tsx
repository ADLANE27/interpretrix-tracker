
import { useEffect, useState } from "react";
import { InterpreterCard } from "../InterpreterCard";
import { StatusFilter } from "../StatusFilter";
import { Input } from "@/components/ui/input";
import { Search, LogOut, X, Menu, ChevronUp, ChevronDown } from "lucide-react";
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
import { RealtimeChannel } from "@supabase/supabase-js";
import { AdminMissionsCalendar } from "./AdminMissionsCalendar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { ReservationsTab } from "./reservations/ReservationsTab";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  last_seen_at: string | null;
  booth_number?: string | null;
  private_phone?: string | null;
  professional_phone?: string | null;
  work_hours?: {
    start_morning: string;
    end_morning: string;
    start_afternoon: string;
    end_afternoon: string;
  } | null;
}

export const AdminDashboard = () => {
  const [interpreters, setInterpreters] = useState<Interpreter[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [birthCountryFilter, setBirthCountryFilter] = useState("all");
  const [employmentStatusFilter, setEmploymentStatusFilter] = useState<string>("all");
  const [rateSort, setRateSort] = useState<string>("none");
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("interpreters");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const sortedLanguages = [...LANGUAGES].sort((a, b) => a.localeCompare(b));

  const tabs = [
    { id: "interpreters", label: "Interprètes" },
    { id: "missions", label: "Missions" },
    { id: "reservations", label: "Réservations" },
    { id: "calendar", label: "Calendrier" },
    { id: "messages", label: "Messages" },
    { id: "users", label: "Utilisateurs" },
    { id: "guide", label: "Guide" },
  ];

  const fetchInterpreters = async () => {
    try {
      console.log("[AdminDashboard] Fetching interpreters data");
      const { data, error } = await supabase
        .from("interpreters_with_next_mission")
        .select(`
          id,
          first_name,
          last_name,
          employment_status,
          languages,
          phone_interpretation_rate,
          phone_number,
          birth_country,
          next_mission_start,
          next_mission_duration,
          tarif_15min,
          tarif_5min,
          connection_status:interpreter_connection_status(
            last_seen_at,
            connection_status,
            updated_at,
            booth_number,
            private_phone,
            professional_phone,
            work_hours
          )
        `);

      if (error) throw error;

      const mappedInterpreters: Interpreter[] = (data || []).map(interpreter => {
        let parsedWorkHours: Interpreter['work_hours'] = null;
        if (interpreter.connection_status?.work_hours) {
          try {
            const workHoursData = interpreter.connection_status.work_hours;
            if (typeof workHoursData === 'object' && workHoursData !== null) {
              parsedWorkHours = {
                start_morning: workHoursData.start_morning || "09:00",
                end_morning: workHoursData.end_morning || "13:00",
                start_afternoon: workHoursData.start_afternoon || "14:00",
                end_afternoon: workHoursData.end_afternoon || "17:00"
              };
            }
          } catch (e) {
            console.error("[AdminDashboard] Error parsing work_hours:", e);
          }
        }

        return {
          id: interpreter.id || "",
          first_name: interpreter.first_name || "",
          last_name: interpreter.last_name || "",
          status: (interpreter.connection_status?.connection_status === "available" ||
                  interpreter.connection_status?.connection_status === "unavailable" ||
                  interpreter.connection_status?.connection_status === "pause" ||
                  interpreter.connection_status?.connection_status === "busy") 
                  ? interpreter.connection_status.connection_status 
                  : "unavailable" as const,
          employment_status: interpreter.employment_status || "salaried_aft",
          languages: interpreter.languages || [],
          phone_interpretation_rate: interpreter.phone_interpretation_rate,
          phone_number: interpreter.phone_number,
          birth_country: interpreter.birth_country,
          next_mission_start: interpreter.next_mission_start,
          next_mission_duration: interpreter.next_mission_duration,
          tarif_15min: interpreter.tarif_15min,
          tarif_5min: interpreter.tarif_5min || null,
          last_seen_at: interpreter.connection_status?.last_seen_at,
          booth_number: interpreter.connection_status?.booth_number || null,
          private_phone: interpreter.connection_status?.private_phone || null,
          professional_phone: interpreter.connection_status?.professional_phone || null,
          work_hours: parsedWorkHours
        };
      });

      setInterpreters(mappedInterpreters);
      console.log("[AdminDashboard] Interpreters data updated:", mappedInterpreters.length, "records");
    } catch (error) {
      console.error("[AdminDashboard] Error fetching interpreters:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des interprètes",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    console.log("[AdminDashboard] Setting up real-time subscriptions");
    const channels: RealtimeChannel[] = [];
    const setupChannel = (channelName: string, table: string) => {
      const channel = supabase.channel(`admin-${channelName}`).on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: table
      }, async payload => {
        console.log(`[AdminDashboard] ${table} changed:`, payload);
        await fetchInterpreters();
      }).subscribe(status => {
        console.log(`[AdminDashboard] ${channelName} subscription status:`, status);
        if (status === 'SUBSCRIBED') {
          console.log(`[AdminDashboard] Successfully subscribed to ${channelName}`);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error(`[AdminDashboard] Error in ${channelName} channel`);
          setTimeout(() => {
            channel.subscribe();
          }, 5000);
        }
      });
      channels.push(channel);
      return channel;
    };
    setupChannel('interpreter-profiles', 'interpreter_profiles');
    setupChannel('missions', 'interpretation_missions');
    setupChannel('user-roles', 'user_roles');
    setupChannel('mission-notifications', 'mission_notifications');
    setupChannel('chat-messages', 'chat_messages');
    setupChannel('message-mentions', 'message_mentions');
    setupChannel('channel-members', 'channel_members');
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("[AdminDashboard] Tab became visible, refreshing data");
        fetchInterpreters();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const handleConnectionState = () => {
      const connectionState = supabase.getChannels().length > 0;
      console.log("[AdminDashboard] Connection state:", connectionState ? "connected" : "disconnected");
      if (!connectionState) {
        console.log("[AdminDashboard] Attempting to reconnect...");
        channels.forEach(channel => channel.subscribe());
      }
    };
    const connectionCheckInterval = setInterval(handleConnectionState, 30000);
    fetchInterpreters();
    return () => {
      console.log("[AdminDashboard] Cleaning up subscriptions");
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(connectionCheckInterval);
    };
  }, []);

  const resetAllFilters = () => {
    setSelectedStatus(null);
    setNameFilter("");
    setLanguageFilter("all");
    setPhoneFilter("");
    setBirthCountryFilter("all");
    setEmploymentStatusFilter("all");
    setRateSort("none");
    toast({
      title: "Filtres réinitialisés",
      description: "Tous les filtres ont été réinitialisés"
    });
  };

  const handleLogout = async () => {
    try {
      const {
        error
      } = await supabase.auth.signOut();
      if (error) throw error;
      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté avec succès"
      });
      navigate("/admin/login");
    } catch (error: any) {
      toast({
        title: "Erreur de déconnexion",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const filteredInterpreters = interpreters.filter(interpreter => {
    const isNotAdmin = !`${interpreter.first_name} ${interpreter.last_name}`.includes("Adlane Admin");
    const matchesStatus = !selectedStatus || interpreter.status === selectedStatus;
    const matchesName = nameFilter === "" || `${interpreter.first_name} ${interpreter.last_name}`.toLowerCase().includes(nameFilter.toLowerCase());
    const matchesLanguage = languageFilter === "all" || interpreter.languages.some(lang => {
      const [source, target] = lang.split(" → ");
      return source.toLowerCase().includes(languageFilter.toLowerCase()) || 
             (target && target.toLowerCase().includes(languageFilter.toLowerCase()));
    });
    const matchesPhone = phoneFilter === "" || interpreter.phone_number && interpreter.phone_number.toLowerCase().includes(phoneFilter.toLowerCase());
    const matchesBirthCountry = birthCountryFilter === "all" || interpreter.birth_country === birthCountryFilter;
    const matchesEmploymentStatus = employmentStatusFilter === "all" || interpreter.employment_status === employmentStatusFilter;
    return isNotAdmin && matchesStatus && matchesName && matchesLanguage && matchesPhone && matchesBirthCountry && matchesEmploymentStatus;
  }).sort((a, b) => {
    if (rateSort === "rate-asc") {
      const rateA = a.tarif_15min ?? 0;
      const rateB = b.tarif_15min ?? 0;
      return rateA - rateB;
    }
    const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
    const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setIsMenuOpen(false);
  };

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col h-full scroll-smooth">
        <div className="flex justify-between items-center sticky top-0 bg-background/95 backdrop-blur-sm z-20 py-3 px-4 sm:px-6 border-b shadow-sm">
          {isMobile ? (
            <div className="flex items-center gap-3 w-full">
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="touch-target">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] sm:w-[320px]">
                  <div className="flex flex-col gap-1.5 mt-6">
                    {tabs.map(tab => (
                      <Button
                        key={tab.id}
                        variant={activeTab === tab.id ? "default" : "ghost"}
                        className="justify-start h-11"
                        onClick={() => handleTabChange(tab.id)}
                      >
                        {tab.label}
                      </Button>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
              <div className="flex-1 text-lg font-semibold">
                {tabs.find(tab => tab.id === activeTab)?.label}
              </div>
            </div>
          ) : (
            <div className="flex gap-4 items-center flex-1">
              <TabsList className="bg-muted/50 flex-1 gap-1">
                {tabs.map(tab => (
                  <TabsTrigger 
                    key={tab.id} 
                    value={tab.id} 
                    className="flex-1 px-6"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          )}
          <Button variant="outline" onClick={handleLogout} className="gap-2 shrink-0">
            <LogOut className="h-4 w-4" />
            {!isMobile && "Se déconnecter"}
          </Button>
        </div>

        <div className="flex-1 min-h-0 relative">
          <TabsContent value="interpreters" className="absolute inset-0 overflow-auto">
            <div className="min-h-full p-4 sm:p-6 space-y-6">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Statut</h2>
                <StatusFilter selectedStatus={selectedStatus} onStatusChange={setSelectedStatus} />
              </div>

              <Collapsible
                open={isFiltersOpen}
                onOpenChange={setIsFiltersOpen}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Filtres avancés</h2>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-9 p-0">
                      {isFiltersOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </div>

                <CollapsibleContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="name-search">Nom</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="name-search"
                          placeholder="Rechercher par nom..."
                          className="pl-9"
                          value={nameFilter}
                          onChange={e => setNameFilter(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="language">Langue</Label>
                      <Select value={languageFilter} onValueChange={setLanguageFilter}>
                        <SelectTrigger id="language">
                          <SelectValue placeholder="Sélectionner une langue" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les langues</SelectItem>
                          {LANGUAGES.map(lang => (
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
                        onChange={e => setPhoneFilter(e.target.value)}
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
                      <Select value={employmentStatusFilter} onValueChange={setEmploymentStatusFilter}>
                        <SelectTrigger id="employment-status">
                          <SelectValue placeholder="Tous les statuts" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les statuts</SelectItem>
                          <SelectItem value="salaried_aft">Salarié AFTrad</SelectItem>
                          <SelectItem value="salaried_aftcom">Salarié AFTCOM</SelectItem>
                          <SelectItem value="salaried_planet">Salarié PLANET</SelectItem>
                          <SelectItem value="permanent_interpreter">Interprète permanent</SelectItem>
                          <SelectItem value="self_employed">Externe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-1.5 lg:col-span-3">
                      <Label htmlFor="rate-sort">Trier par tarif</Label>
                      <div className="flex gap-2 items-start">
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
                  </div>

                  <div className="flex justify-end">
                    <Button variant="outline" onClick={resetAllFilters} className="gap-2">
                      <X className="h-4 w-4" />
                      Supprimer tous les filtres
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredInterpreters.map(interpreter => (
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
                      booth_number: interpreter.booth_number,
                      private_phone: interpreter.private_phone,
                      professional_phone: interpreter.professional_phone,
                      work_hours: interpreter.work_hours
                    }}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="missions" className="absolute inset-0 overflow-auto">
            <div className="min-h-full p-4 sm:p-6">
              <MissionManagement />
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="absolute inset-0 overflow-auto">
            <div className="min-h-full p-4 sm:p-6">
              <AdminMissionsCalendar />
            </div>
          </TabsContent>

          <TabsContent value="messages" className="absolute inset-0 overflow-auto">
            <div className="min-h-full p-4 sm:p-6">
              <MessagesTab />
            </div>
          </TabsContent>

          <TabsContent value="users" className="absolute inset-0 overflow-auto">
            <div className="min-h-full p-4 sm:p-6">
              <UserManagement />
            </div>
          </TabsContent>

          <TabsContent value="reservations" className="absolute inset-0 overflow-auto">
            <div className="min-h-full p-4 sm:p-6">
              <ReservationsTab />
            </div>
          </TabsContent>

          <TabsContent value="guide" className="absolute inset-0 overflow-auto">
            <div className="min-h-full p-4 sm:p-6">
              <AdminGuideContent />
            </div>
          </TabsContent>
        </div>

        <footer className="py-3 text-center text-sm text-muted-foreground border-t px-4 sm:px-6 bg-background/95 backdrop-blur-sm">
          © {new Date().getFullYear()} AFTraduction. Tous droits réservés.
        </footer>
      </Tabs>
    </div>
  );
};
