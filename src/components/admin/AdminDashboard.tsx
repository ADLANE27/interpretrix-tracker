import React, { useEffect, useState } from "react";
import InterpreterCard from "../InterpreterCard";
import { StatusFilter } from "../StatusFilter";
import { Input } from "@/components/ui/input";
import { Search, LogOut, X, Menu, ChevronUp, ChevronDown, LayoutGrid, List, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import { InterpreterListItem } from "./interpreter/InterpreterListItem";
import { EmploymentStatus, employmentStatusLabels, getEmploymentStatusOptions } from "@/utils/employmentStatus";
import { Profile } from "@/types/profile";
import { useTabPersistence } from "@/hooks/useTabPersistence";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatisticsCards } from "./dashboard/StatisticsCards";
import { Card } from "@/components/ui/card";
import { LanguageCombobox } from "../interpreter/LanguageCombobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkLocation, workLocationLabels } from "@/utils/workLocationStatus";

interface WorkHours {
  start_morning?: string;
  end_morning?: string;
  start_afternoon?: string;
  end_afternoon?: string;
}

interface Interpreter {
  id: string;
  first_name: string;
  last_name: string;
  status: Profile['status'];
  employment_status: EmploymentStatus;
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
  work_hours?: WorkHours | null;
  connection_status?: Profile['status'];
  next_mission_source_language?: string | null;
  next_mission_target_language?: string | null;
  work_location?: WorkLocation | null;
}

const AdminDashboard = () => {
  const [interpreters, setInterpreters] = useState<Interpreter[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [birthCountryFilter, setBirthCountryFilter] = useState("all");
  const [employmentStatusFilters, setEmploymentStatusFilters] = useState<EmploymentStatus[]>([]);
  const [rateSort, setRateSort] = useState<string>("none");
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [todayMissionsCount, setTodayMissionsCount] = useState(0);
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const sortedLanguages = [...LANGUAGES].sort((a, b) => a.localeCompare(b));
  const employmentStatusOptions = getEmploymentStatusOptions();
  const tabs = [{
    id: "interpreters",
    label: "Interprètes"
  }, {
    id: "missions",
    label: "Missions"
  }, {
    id: "reservations",
    label: "Réservations"
  }, {
    id: "calendar",
    label: "Calendrier"
  }, {
    id: "messages",
    label: "Messages"
  }, {
    id: "users",
    label: "Utilisateurs"
  }, {
    id: "guide",
    label: "Guide"
  }];
  const {
    activeTab,
    setActiveTab
  } = useTabPersistence("interpreters");

  const handleInterpreterStatusChange = (interpreterId: string, newStatus: Profile['status']) => {
    console.log(`[AdminDashboard] Status change for interpreter ${interpreterId}: ${newStatus}`);
    
    setInterpreters(current => 
      current.map(interpreter => 
        interpreter.id === interpreterId 
          ? { ...interpreter, status: newStatus } 
          : interpreter
      )
    );

    const interpreter = interpreters.find(i => i.id === interpreterId);
    if (interpreter) {
      toast({
        title: "Statut mis à jour",
        description: `Le statut de ${interpreter.first_name} ${interpreter.last_name} a été mis à jour`,
      });
    }
  };

  useEffect(() => {
    console.log("[AdminDashboard] Setting up real-time subscriptions and event listeners");
    const channels: RealtimeChannel[] = [];

    // Channel for interpreter profile changes (status updates)
    const interpreterChannel = supabase.channel('admin-interpreter-profiles').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'interpreter_profiles'
    }, async payload => {
      console.log(`[AdminDashboard] Interpreter profiles changed:`, payload);
      await fetchInterpreters();
    }).subscribe(status => {
      console.log(`[AdminDashboard] Interpreter profiles subscription status:`, status);
    });
    channels.push(interpreterChannel);

    // Channel for private reservations changes
    const reservationsChannel = supabase.channel('admin-private-reservations').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'private_reservations'
    }, async payload => {
      console.log(`[AdminDashboard] Private reservations changed:`, payload);
      await fetchInterpreters();
    }).subscribe(status => {
      console.log(`[AdminDashboard] Private reservations subscription status:`, status);
    });
    channels.push(reservationsChannel);
    
    // Listen for interpreter status update events from useMissionUpdates
    const handleStatusUpdate = () => {
      console.log("[AdminDashboard] Received interpreter status update event");
      fetchInterpreters();
    };
    window.addEventListener('interpreter-status-update', handleStatusUpdate);
    
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

    // Initial fetch
    fetchInterpreters();
    return () => {
      console.log("[AdminDashboard] Cleaning up subscriptions and event listeners");
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('interpreter-status-update', handleStatusUpdate);
      clearInterval(connectionCheckInterval);
    };
  }, []);

  const fetchInterpreters = async () => {
    try {
      console.log("[AdminDashboard] Fetching interpreters data");
      const {
        data,
        error
      } = await supabase.from("interpreter_profiles").select(`
          *,
          private_reservations!left(
            id,
            start_time,
            end_time,
            duration_minutes,
            source_language,
            target_language,
            status
          )
        `);
      if (error) throw error;
      console.log("[AdminDashboard] Raw data:", data);
      const uniqueInterpreters = Array.from(new Map((data || []).map(item => [item.id, item])).values());
      const mappedInterpreters: Interpreter[] = uniqueInterpreters.map(interpreter => {
        let workHours = null;
        if (interpreter.work_hours && typeof interpreter.work_hours === 'object') {
          const hours = interpreter.work_hours as Record<string, any>;
          workHours = {
            start_morning: hours.start_morning || '',
            end_morning: hours.end_morning || '',
            start_afternoon: hours.start_afternoon || '',
            end_afternoon: hours.end_afternoon || ''
          };
        }
        const now = new Date();

        // Find next scheduled private reservation
        const nextReservation = interpreter.private_reservations?.find(reservation => reservation?.start_time && new Date(reservation.start_time) > now && reservation.status === 'scheduled');
        console.log(`[AdminDashboard] Interpreter ${interpreter.first_name} ${interpreter.last_name} next reservation:`, nextReservation);
        
        // Make sure work_location is correctly typed
        const workLocation = interpreter.work_location as WorkLocation || "on_site";
        console.log(`[AdminDashboard] Interpreter ${interpreter.first_name} ${interpreter.last_name} work location:`, workLocation);
        
        return {
          id: interpreter.id || "",
          first_name: interpreter.first_name || "",
          last_name: interpreter.last_name || "",
          status: interpreter.status === "available" || interpreter.status === "unavailable" || interpreter.status === "pause" || interpreter.status === "busy" ? interpreter.status : "unavailable" as const,
          employment_status: interpreter.employment_status || "salaried_aft",
          languages: interpreter.languages || [],
          phone_interpretation_rate: interpreter.phone_interpretation_rate,
          phone_number: interpreter.phone_number,
          birth_country: interpreter.birth_country,
          next_mission_start: nextReservation?.start_time || null,
          next_mission_duration: nextReservation?.duration_minutes || null,
          next_mission_source_language: nextReservation?.source_language || null,
          next_mission_target_language: nextReservation?.target_language || null,
          tarif_15min: interpreter.tarif_15min,
          tarif_5min: interpreter.tarif_5min || null,
          last_seen_at: null,
          booth_number: interpreter.booth_number || null,
          private_phone: interpreter.private_phone || null,
          professional_phone: interpreter.professional_phone || null,
          work_hours: workHours,
          work_location: workLocation
        };
      });
      setInterpreters(mappedInterpreters);
      console.log("[AdminDashboard] Interpreters data updated:", mappedInterpreters.length, "records");

      // Fetch scheduled missions and private reservations for today's count
      fetchTodayMissions();
    } catch (error) {
      console.error("[AdminDashboard] Error fetching interpreters:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des interprètes",
        variant: "destructive"
      });
    }
  };

  const fetchTodayMissions = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const todayStart = today.toISOString();
      const tomorrowStart = tomorrow.toISOString();
      console.log("[AdminDashboard] Fetching today's missions", todayStart, tomorrowStart);

      // Fetch scheduled missions for today
      const {
        data: scheduledMissions,
        error: scheduledError
      } = await supabase.from("interpretation_missions").select("id").eq("mission_type", "scheduled").gte("scheduled_start_time", todayStart).lt("scheduled_start_time", tomorrowStart);
      if (scheduledError) throw scheduledError;

      // Fetch private reservations for today
      const {
        data: privateReservations,
        error: reservationsError
      } = await supabase.from("private_reservations").select("id").eq("status", "scheduled").gte("start_time", todayStart).lt("start_time", tomorrowStart);
      if (reservationsError) throw reservationsError;
      const scheduledCount = scheduledMissions?.length || 0;
      const reservationsCount = privateReservations?.length || 0;
      const totalMissionsToday = scheduledCount + reservationsCount;
      console.log("[AdminDashboard] Today's missions count:", {
        scheduledMissions: scheduledCount,
        privateReservations: reservationsCount,
        total: totalMissionsToday
      });
      setTodayMissionsCount(totalMissionsToday);
    } catch (error) {
      console.error("[AdminDashboard] Error fetching today's missions:", error);
    }
  };

  const resetAllFilters = () => {
    setSelectedStatus(null);
    setNameFilter("");
    setLanguageFilter("all");
    setPhoneFilter("");
    setBirthCountryFilter("all");
    setEmploymentStatusFilters([]);
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

  const toggleEmploymentStatusFilter = (status: EmploymentStatus) => {
    setEmploymentStatusFilters(current => {
      if (current.includes(status)) {
        return current.filter(s => s !== status);
      } else {
        return [...current, status];
      }
    });
  };

  const filteredInterpreters = interpreters.filter(interpreter => {
    const matchesStatus = !selectedStatus || interpreter.status === selectedStatus;
    const matchesName = nameFilter === "" || `${interpreter.first_name} ${interpreter.last_name}`.toLowerCase().includes(nameFilter.toLowerCase());
    const matchesLanguage = languageFilter === "all" || interpreter.languages.some(lang => {
      const [source, target] = lang.split('→').map(l => l.trim());
      return source.toLowerCase().includes(languageFilter.toLowerCase()) || target?.toLowerCase().includes(languageFilter.toLowerCase());
    });
    const matchesPhone = phoneFilter === "" || interpreter.phone_number && interpreter.phone_number.toLowerCase().includes(phoneFilter.toLowerCase());
    const matchesBirthCountry = birthCountryFilter === "all" || interpreter.birth_country === birthCountryFilter;
    const matchesEmploymentStatus = employmentStatusFilters.length === 0 || employmentStatusFilters.includes(interpreter.employment_status);
    return matchesStatus && matchesName && matchesLanguage && matchesPhone && matchesBirthCountry && matchesEmploymentStatus;
  }).sort((a, b) => {
    if (rateSort === "rate-asc") {
      return (a.tarif_15min || 0) - (b.tarif_15min || 0);
    }
    return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setIsMenuOpen(false);
  };

  const availableCount = interpreters.filter(i => i.status === "available").length;
  const busyCount = interpreters.filter(i => i.status === "busy").length;
  const pauseCount = interpreters.filter(i => i.status === "pause").length;
  const unavailableCount = interpreters.filter(i => i.status === "unavailable").length;

  return <div className="flex flex-col h-full bg-[#1a2844]">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col h-full scroll-smooth">
        <div className="flex justify-between items-center sticky top-0 backdrop-blur-sm z-20 py-3 px-4 sm:px-6 border-b border-[#2a3854] shadow-sm bg-slate-50">
          {isMobile ? <div className="flex items-center gap-3 w-full">
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="touch-target">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] sm:w-[320px]">
                  <div className="flex flex-col gap-1.5 mt-6">
                    {tabs.map(tab => <Button key={tab.id} variant={activeTab === tab.id ? "default" : "ghost"} className="justify-start h-11" onClick={() => handleTabChange(tab.id)}>
                        {tab.label}
                      </Button>)}
                  </div>
                </SheetContent>
              </Sheet>
              <div className="flex-1 text-lg font-semibold">
                {tabs.find(tab => tab.id === activeTab)?.label}
              </div>
            </div> : <div className="flex gap-4 items-center flex-1">
              <TabsList className="bg-muted/50 flex-1 gap-1">
                {tabs.map(tab => <TabsTrigger key={tab.id} value={tab.id} className="flex-1 px-6">
                    {tab.label}
                  </TabsTrigger>)}
              </TabsList>
            </div>}
          <Button variant="outline" onClick={handleLogout} className="gap-2 shrink-0">
            <LogOut className="h-4 w-4" />
            {!isMobile && "Se déconnecter"}
          </Button>
        </div>

        <div className="flex-1 min-h-0 relative bg-[#1a2844]">
          <TabsContent value="interpreters" className="absolute inset-0 overflow-auto bg-slate-50">
            <div className="min-h-full p-4 sm:p-6 space-y-6 bg-slate-50">
              <StatisticsCards totalInterpreters={interpreters.length} availableCount={availableCount} busyCount={busyCount} pauseCount={pauseCount} unavailableCount={unavailableCount} todayMissionsCount={todayMissionsCount} />
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex-1 w-full sm:w-auto flex justify-center">
                  <StatusFilter selectedStatus={selectedStatus} onStatusChange={setSelectedStatus} />
                </div>
                <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")} className="gap-2">
                  {viewMode === "grid" ? <>
                      <List className="h-4 w-4" />
                      Vue compacte
                    </> : <>
                      <LayoutGrid className="h-4 w-4" />
                      Vue détaillée
                    </>}
                </Button>
              </div>

              <Card className="p-6">
                <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Filter className="h-5 w-5 text-primary" />
                      Filtres avancés
                    </h2>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={resetAllFilters} className="gap-2">
                        <X className="h-4 w-4" />
                        Supprimer tous les filtres
                      </Button>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-9 p-0">
                          {isFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>

                  <CollapsibleContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="name-search">Nom</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input id="name-search" placeholder="Rechercher par nom..." className="pl-9" value={nameFilter} onChange={e => setNameFilter(e.target.value)} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="language">Langue</Label>
                        <LanguageCombobox 
                          languages={LANGUAGES}
                          value={languageFilter}
                          onChange={setLanguageFilter}
                          placeholder="Rechercher une langue..."
                          emptyMessage="Aucune langue trouvée."
                          allLanguagesLabel="Toutes les langues"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone-search">Numéro de téléphone</Label>
                        <Input id="phone-search" placeholder="Rechercher par téléphone..." value={phoneFilter} onChange={e => setPhoneFilter(e.target.value)} />
                      </div>

                      <CountrySelect value={birthCountryFilter} onValueChange={setBirthCountryFilter} label="Pays de naissance" placeholder="Sélectionner un pays" />

                      <div className="space-y-2">
                        <Label htmlFor="employment-status">Statut professionnel</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-full justify-between h-10">
                              {employmentStatusFilters.length === 0 ? "Tous les statuts" : employmentStatusFilters.length === 1 ? employmentStatusLabels[employmentStatusFilters[0]] : `${employmentStatusFilters.length} statuts sélectionnés`}
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <div className="p-2">
                              <div className="flex items-center space-x-2 pb-2">
                                <Checkbox id="select-all-statuses" checked={employmentStatusFilters.length === Object.keys(employmentStatusLabels).length} onCheckedChange={checked => {
                                if (checked) {
                                  setEmploymentStatusFilters(Object.keys(employmentStatusLabels) as EmploymentStatus[]);
                                } else {
                                  setEmploymentStatusFilters([]);
                                }
                              }} />
                                <label htmlFor="select-all-statuses" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                  Tout sélectionner
                                </label>
                              </div>
                              
                              <div className="border-t my-2"></div>
                              
                              {Object.entries(employmentStatusLabels).map(([value, label]) => <div key={value} className="flex items-center space-x-2 py-1">
                                  <Checkbox id={`status-${value}`} checked={employmentStatusFilters.includes(value as EmploymentStatus)} onCheckedChange={() => toggleEmploymentStatusFilter(value as EmploymentStatus)} />
                                  <label htmlFor={`status-${value}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {label}
                                  </label>
                                </div>)}
                            </div>
                          </PopoverContent>
                        </Popover>
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
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4" : "space-y-2"}>
                {filteredInterpreters.map(interpreter => viewMode === "grid" ? <InterpreterCard key={interpreter.id} interpreter={{
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
                next_mission_source_language: interpreter.next_mission_source_language,
                next_mission_target_language: interpreter.next_mission_target_language,
                booth_number: interpreter.booth_number,
                private_phone: interpreter.private_phone,
                professional_phone: interpreter.professional_phone,
                work_hours: interpreter.work_hours,
                work_location: interpreter.work_location as WorkLocation
              }} 
              onStatusChange={handleInterpreterStatusChange}
              /> : <InterpreterListItem key={interpreter.id} interpreter={{
                id: interpreter.id,
                name: `${interpreter.first_name} ${interpreter.last_name}`,
                status: interpreter.status || "unavailable",
                employment_status: interpreter.employment_status,
                languages: interpreter.languages,
                next_mission_start: interpreter.next_mission_start,
                next_mission_duration: interpreter.next_mission_duration,
                work_location: interpreter.work_location as WorkLocation
              }}
              onStatusChange={handleInterpreterStatusChange}
              />)}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="missions" className="absolute inset-0 overflow-auto bg-[#1a2844]">
            <div className="min-h-full p-4 sm:p-6 bg-slate-50">
              <MissionManagement />
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="absolute inset-0 overflow-auto bg-[#1a2844]">
            <div className="min-h-full p-4 sm:p-6 bg-slate-50">
              <AdminMissionsCalendar />
            </div>
          </TabsContent>

          <TabsContent value="messages" className="absolute inset-0 overflow-auto bg-[#1a2844]">
            <div className="min-h-full p-4 sm:p-6 bg-slate-50">
              <MessagesTab />
            </div>
          </TabsContent>

          <TabsContent value="users" className="absolute inset-0 overflow-auto bg-[#1a2844]">
            <div className="min-h-full p-4 sm:p-6 bg-slate-50">
              <UserManagement />
            </div>
          </TabsContent>

          <TabsContent value="reservations" className="absolute inset-0 overflow-auto bg-[#1a2844]">
            <div className="min-h-full p-4 sm:p-6 bg-slate-50">
              <ReservationsTab />
            </div>
          </TabsContent>

          <TabsContent value="guide" className="absolute inset-0 overflow-auto bg-[#1a2844]">
            <div className="min-h-full p-4 sm:p-6 bg-slate-50">
              <AdminGuideContent />
            </div>
          </TabsContent>
        </div>

        <footer className="py-3 text-center text-sm text-muted-foreground border-t px-4 sm:px-6 backdrop-blur-sm bg-slate-50">
          © {new Date().getFullYear()} AFTraduction. Tous droits réservés.
        </footer>
      </Tabs>
    </div>;
};

export default AdminDashboard;
