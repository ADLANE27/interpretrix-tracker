
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Profile } from "@/types/profile";
import { WorkLocation } from "@/utils/workLocationStatus";
import { EmploymentStatus } from "@/utils/employmentStatus";
import { StatisticsCards } from "@/components/admin/dashboard/StatisticsCards";
import { InterpreterFilterBar } from "./InterpreterFilterBar";
import { AdvancedFilters } from "./AdvancedFilters";
import { InterpretersList } from "./InterpretersList";

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

export const InterpretersTab: React.FC = () => {
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
  const { toast } = useToast();

  const handleInterpreterStatusChange = (interpreterId: string, newStatus: Profile['status']) => {
    console.log(`[InterpretersTab] Status change for interpreter ${interpreterId}: ${newStatus}`);
    
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
    console.log("[InterpretersTab] Setting up real-time subscriptions and event listeners");
    const channels: RealtimeChannel[] = [];

    // Channel for interpreter profile changes (status updates)
    const interpreterChannel = supabase.channel('admin-interpreter-profiles').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'interpreter_profiles'
    }, async payload => {
      console.log(`[InterpretersTab] Interpreter profiles changed:`, payload);
      await fetchInterpreters();
    }).subscribe(status => {
      console.log(`[InterpretersTab] Interpreter profiles subscription status:`, status);
    });
    channels.push(interpreterChannel);

    // Channel for private reservations changes
    const reservationsChannel = supabase.channel('admin-private-reservations').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'private_reservations'
    }, async payload => {
      console.log(`[InterpretersTab] Private reservations changed:`, payload);
      await fetchInterpreters();
    }).subscribe(status => {
      console.log(`[InterpretersTab] Private reservations subscription status:`, status);
    });
    channels.push(reservationsChannel);
    
    // Listen for interpreter status update events from useMissionUpdates
    const handleStatusUpdate = () => {
      console.log("[InterpretersTab] Received interpreter status update event");
      fetchInterpreters();
    };
    window.addEventListener('interpreter-status-update', handleStatusUpdate);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("[InterpretersTab] Tab became visible, refreshing data");
        fetchInterpreters();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const handleConnectionState = () => {
      const connectionState = supabase.getChannels().length > 0;
      console.log("[InterpretersTab] Connection state:", connectionState ? "connected" : "disconnected");
      if (!connectionState) {
        console.log("[InterpretersTab] Attempting to reconnect...");
        channels.forEach(channel => channel.subscribe());
      }
    };
    const connectionCheckInterval = setInterval(handleConnectionState, 30000);

    // Initial fetch
    fetchInterpreters();
    return () => {
      console.log("[InterpretersTab] Cleaning up subscriptions and event listeners");
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
      console.log("[InterpretersTab] Fetching interpreters data");
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
      console.log("[InterpretersTab] Raw data:", data);
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
        console.log(`[InterpretersTab] Interpreter ${interpreter.first_name} ${interpreter.last_name} next reservation:`, nextReservation);
        
        // Make sure work_location is correctly typed
        const workLocation = interpreter.work_location as WorkLocation || "on_site";
        console.log(`[InterpretersTab] Interpreter ${interpreter.first_name} ${interpreter.last_name} work location:`, workLocation);
        
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
      console.log("[InterpretersTab] Interpreters data updated:", mappedInterpreters.length, "records");

      // Fetch scheduled missions and private reservations for today's count
      fetchTodayMissions();
    } catch (error) {
      console.error("[InterpretersTab] Error fetching interpreters:", error);
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
      console.log("[InterpretersTab] Fetching today's missions", todayStart, tomorrowStart);

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
      console.log("[InterpretersTab] Today's missions count:", {
        scheduledMissions: scheduledCount,
        privateReservations: reservationsCount,
        total: totalMissionsToday
      });
      setTodayMissionsCount(totalMissionsToday);
    } catch (error) {
      console.error("[InterpretersTab] Error fetching today's missions:", error);
    }
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

  const availableCount = interpreters.filter(i => i.status === "available").length;
  const busyCount = interpreters.filter(i => i.status === "busy").length;
  const pauseCount = interpreters.filter(i => i.status === "pause").length;
  const unavailableCount = interpreters.filter(i => i.status === "unavailable").length;

  return (
    <div className="min-h-full p-4 sm:p-6 space-y-6 bg-slate-50">
      <StatisticsCards 
        totalInterpreters={interpreters.length} 
        availableCount={availableCount} 
        busyCount={busyCount} 
        pauseCount={pauseCount} 
        unavailableCount={unavailableCount} 
        todayMissionsCount={todayMissionsCount} 
      />
      
      <InterpreterFilterBar
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      <AdvancedFilters
        isFiltersOpen={isFiltersOpen}
        setIsFiltersOpen={setIsFiltersOpen}
        nameFilter={nameFilter}
        setNameFilter={setNameFilter}
        languageFilter={languageFilter}
        setLanguageFilter={setLanguageFilter}
        phoneFilter={phoneFilter}
        setPhoneFilter={setPhoneFilter}
        birthCountryFilter={birthCountryFilter}
        setBirthCountryFilter={setBirthCountryFilter}
        employmentStatusFilters={employmentStatusFilters}
        setEmploymentStatusFilters={setEmploymentStatusFilters}
        rateSort={rateSort}
        setRateSort={setRateSort}
      />

      <InterpretersList
        interpreters={filteredInterpreters}
        viewMode={viewMode}
        onStatusChange={handleInterpreterStatusChange}
      />
    </div>
  );
};
