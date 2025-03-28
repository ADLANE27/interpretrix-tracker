
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Profile } from "@/types/profile";
import { WorkLocation } from "@/utils/workLocationStatus";
import { EmploymentStatus } from "@/utils/employmentStatus";
import { StatisticsCards } from "@/components/admin/dashboard/StatisticsCards";
import { InterpreterFilterBar } from "./InterpreterFilterBar";
import { AdvancedFilters } from "./AdvancedFilters";
import { InterpretersList } from "./InterpretersList";
import { eventEmitter, EVENT_CONNECTION_STATUS_CHANGE, onConnectionStatusChange } from '@/lib/events';
import { useTableSubscription } from "@/hooks/useTableSubscription";

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
  next_mission_source_language?: string | null;
  next_mission_target_language?: string | null;
  tarif_15min: number | null;
  tarif_5min: number | null;
  last_seen_at: string | null;
  booth_number?: string | null;
  private_phone: string | null;
  professional_phone: string | null;
  work_hours?: WorkHours | null;
  connection_status?: Profile['status'];
  work_location?: WorkLocation | null;
}

export const InterpretersTab: React.FC = React.memo(() => {
  const [interpreters, setInterpreters] = useState<Interpreter[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [birthCountryFilter, setBirthCountryFilter] = useState("all");
  const [employmentStatusFilters, setEmploymentStatusFilters] = useState<EmploymentStatus[]>([]);
  const [rateSort, setRateSort] = useState<string>("none");
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const [todayMissionsCount, setTodayMissionsCount] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isConnected, setIsConnected] = useState(true);
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState(0);
  const { toast } = useToast();
  
  // Stable fetchInterpreters reference with throttling
  const fetchInterpreters = useCallback(async (force = false) => {
    const now = Date.now();
    // Throttle fetches to avoid excessive calls (no more than once every 10 seconds unless forced)
    if (!force && (now - lastFetchTimestamp < 10000)) {
      console.log("[InterpretersTab] Skipping fetch, too soon since last fetch");
      return;
    }
    
    try {
      console.log("[InterpretersTab] Fetching interpreters data");
      setLastFetchTimestamp(now);
      
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

        const nextReservation = interpreter.private_reservations?.find(reservation => reservation?.start_time && new Date(reservation.start_time) > now && reservation.status === 'scheduled');
        
        const workLocation = interpreter.work_location as WorkLocation || "on_site";
        
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

      fetchTodayMissions();
    } catch (error) {
      console.error("[InterpretersTab] Error fetching interpreters:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des interprètes",
        variant: "destructive"
      });
    }
  }, [toast, lastFetchTimestamp]);

  // Stable fetchTodayMissions reference
  const fetchTodayMissions = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const todayStart = today.toISOString();
      const tomorrowStart = tomorrow.toISOString();
      console.log("[InterpretersTab] Fetching today's missions", todayStart, tomorrowStart);

      const {
        data: scheduledMissions,
        error: scheduledError
      } = await supabase.from("interpretation_missions").select("id").eq("mission_type", "scheduled").gte("scheduled_start_time", todayStart).lt("scheduled_start_time", tomorrowStart);
      if (scheduledError) throw scheduledError;

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
  }, []);

  // Stable handler for interpreter status changes
  const handleInterpreterStatusChange = useCallback(async (interpreterId: string, newStatus: Profile['status']) => {
    try {
      // Update our local state immediately for better UX
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
          description: `Le statut de ${interpreter.first_name} ${interpreter.last_name} a été mis à jour en ${newStatus}`,
        });
      }
    } catch (error) {
      console.error('[InterpretersTab] Error updating interpreter status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut de l'interprète",
        variant: "destructive"
      });
    }
  }, [interpreters, toast]);

  // Listen for connection status changes with a stable handler
  useEffect(() => {
    const handleConnectionStatusChange = (connected: boolean) => {
      setIsConnected(connected);
      if (connected) {
        fetchInterpreters(true); // Force refresh when connection is restored
      }
    };
    
    const cleanup = onConnectionStatusChange(handleConnectionStatusChange, 'interpreters-tab-connection');
    
    return () => {
      cleanup();
    };
  }, [fetchInterpreters]);

  // Subscribe to reservation changes using the centralized hook
  useTableSubscription(
    'private_reservations',
    '*',
    null,
    useCallback(() => {
      console.log('[InterpretersTab] Reservation update detected');
      fetchInterpreters();
    }, [fetchInterpreters])
  );
  
  // Subscribe to interpreter profile changes with a memoized callback
  useTableSubscription(
    'interpreter_profiles',
    'UPDATE',
    'status=eq.available,status=eq.unavailable,status=eq.busy,status=eq.pause',
    useCallback((payload) => {
      if (payload.new && payload.old && payload.new.status !== payload.old.status) {
        const interpreterId = payload.new.id;
        const newStatus = payload.new.status;
        
        setInterpreters(current => 
          current.map(interpreter => 
            interpreter.id === interpreterId 
              ? { ...interpreter, status: newStatus as Profile['status'] } 
              : interpreter
          )
        );
      }
    }, [])
  );

  // Initial data fetch with debounced visibility change handler
  useEffect(() => {
    let isComponentMounted = true;
    let visibilityTimeout: NodeJS.Timeout | null = null;
    
    // Initial fetch
    fetchInterpreters();
    
    // Debounced visibility change handler to prevent duplicate fetches
    const handleVisibilityChange = () => {
      if (!isComponentMounted) return;
      
      if (document.visibilityState === 'visible') {
        // Clear any pending timeout
        if (visibilityTimeout) {
          clearTimeout(visibilityTimeout);
        }
        
        // Set a small delay to avoid duplicate fetches if multiple visibility events fire
        visibilityTimeout = setTimeout(() => {
          console.log("[InterpretersTab] Tab became visible, refreshing data");
          fetchInterpreters();
          visibilityTimeout = null;
        }, 300);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      isComponentMounted = false;
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchInterpreters]);

  // Memoize filtered interpreters to prevent recalculation on every render
  const filteredInterpreters = useMemo(() => {
    console.log("[InterpretersTab] Filtering interpreters with criteria:", { 
      selectedStatus, 
      nameFilter, 
      languageFilter,
      employmentStatusFilters: employmentStatusFilters.length
    });
    
    return interpreters.filter(interpreter => {
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
  }, [
    interpreters, 
    selectedStatus, 
    nameFilter, 
    languageFilter, 
    phoneFilter, 
    birthCountryFilter, 
    employmentStatusFilters, 
    rateSort
  ]);

  // Memoize statistics to prevent recalculation on every render
  const statistics = useMemo(() => {
    const availableCount = interpreters.filter(i => i.status === "available").length;
    const busyCount = interpreters.filter(i => i.status === "busy").length;
    const pauseCount = interpreters.filter(i => i.status === "pause").length;
    const unavailableCount = interpreters.filter(i => i.status === "unavailable").length;
    
    return {
      totalInterpreters: interpreters.length,
      availableCount,
      busyCount,
      pauseCount,
      unavailableCount,
      todayMissionsCount
    };
  }, [interpreters, todayMissionsCount]);

  return (
    <div className="min-h-full p-4 sm:p-6 space-y-6 bg-slate-50">
      <StatisticsCards 
        totalInterpreters={statistics.totalInterpreters} 
        availableCount={statistics.availableCount} 
        busyCount={statistics.busyCount} 
        pauseCount={statistics.pauseCount} 
        unavailableCount={statistics.unavailableCount} 
        todayMissionsCount={statistics.todayMissionsCount} 
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

      {!isConnected && (
        <div className="bg-amber-100 border border-amber-400 text-amber-700 px-4 py-2 rounded-md shadow-sm mb-4 animate-pulse">
          Reconnexion en cours...
        </div>
      )}

      <InterpretersList
        interpreters={filteredInterpreters}
        onStatusChange={handleInterpreterStatusChange}
        viewMode={viewMode}
      />
    </div>
  );
});

InterpretersTab.displayName = 'InterpretersTab';
