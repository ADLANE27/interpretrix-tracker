import { useState, useEffect } from "react";
import InterpreterCard from "@/components/InterpreterCard";
import { StatusFilter } from "@/components/StatusFilter";
import { Input } from "@/components/ui/input";
import { Search, X, LayoutGrid, List, ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CountrySelect } from "@/components/CountrySelect";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { InterpreterListItem } from "../interpreter/InterpreterListItem";
import { LANGUAGES } from "@/lib/constants";
import { EmploymentStatus, employmentStatusLabels } from "@/types/employment";
import { WorkHours } from "@/types/workHours";
import { Button } from "@/components/ui/button";

interface Interpreter {
  id: string;
  first_name: string;
  last_name: string;
  status: "available" | "unavailable" | "pause" | "busy";
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
  connection_status?: "available" | "unavailable" | "pause" | "busy";
}

const defaultWorkHours: WorkHours = {
  start_morning: "09:00",
  end_morning: "13:00",
  start_afternoon: "14:00",
  end_afternoon: "17:00"
};

export const InterpretersTab = () => {
  const [interpreters, setInterpreters] = useState<Interpreter[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [birthCountryFilter, setBirthCountryFilter] = useState("all");
  const [employmentStatusFilter, setEmploymentStatusFilter] = useState<string>("all");
  const [rateSort, setRateSort] = useState<string>("none");
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const {
    toast
  } = useToast();
  const sortedLanguages = [...LANGUAGES].sort((a, b) => a.localeCompare(b));

  const fetchInterpreters = async () => {
    try {
      console.log("[AdminDashboard] Fetching interpreters data");
      const { data, error } = await supabase
        .from("interpreters_with_next_mission")
        .select();

      if (error) throw error;

      const mappedInterpreters: Interpreter[] = (data || []).map(interpreter => {
        let workHours: WorkHours | null = null;
        if (interpreter.work_hours && typeof interpreter.work_hours === 'object') {
          const hours = interpreter.work_hours as Record<string, any>;
          if (hours.start_morning && hours.end_morning && hours.start_afternoon && hours.end_afternoon) {
            workHours = {
              start_morning: hours.start_morning,
              end_morning: hours.end_morning,
              start_afternoon: hours.start_afternoon,
              end_afternoon: hours.end_afternoon
            };
          } else {
            workHours = defaultWorkHours;
          }
        }

        return {
          id: interpreter.id || "",
          first_name: interpreter.first_name || "",
          last_name: interpreter.last_name || "",
          status: (interpreter.status === "available" ||
                  interpreter.status === "unavailable" ||
                  interpreter.status === "pause" ||
                  interpreter.status === "busy") 
                  ? interpreter.status 
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
          last_seen_at: interpreter.last_seen_at,
          booth_number: interpreter.booth_number || null,
          private_phone: interpreter.private_phone || null,
          professional_phone: interpreter.professional_phone || null,
          work_hours: workHours
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
    const channels: any[] = [];
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

  return (
    <div className="min-h-full p-4 sm:p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Statut</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="gap-2"
          >
            {viewMode === "grid" ? (
              <>
                <List className="h-4 w-4" />
                Vue compacte
              </>
            ) : (
              <>
                <LayoutGrid className="h-4 w-4" />
                Vue détaillée
              </>
            )}
          </Button>
        </div>
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
                  {Object.entries(employmentStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
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

      <div className={viewMode === "grid" 
        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
        : "space-y-2"
      }>
        {filteredInterpreters.map(interpreter => (
          viewMode === "grid" ? (
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
          ) : (
            <InterpreterListItem
              key={interpreter.id}
              interpreter={{
                id: interpreter.id,
                name: `${interpreter.first_name} ${interpreter.last_name}`,
                status: interpreter.status || "unavailable",
                employment_status: interpreter.employment_status,
                languages: interpreter.languages,
                next_mission_start: interpreter.next_mission_start,
                next_mission_duration: interpreter.next_mission_duration,
              }}
            />
          )
        ))}
      </div>
    </div>
  );
};
