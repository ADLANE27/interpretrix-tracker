
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Profile } from "@/types/profile";
import { WorkLocation } from "@/utils/workLocationStatus";
import { EmploymentStatus } from "@/utils/employmentStatus";
import { StatisticsCards } from "@/components/admin/dashboard/StatisticsCards";
import { InterpreterFilterBar } from "./InterpreterFilterBar";
import { AdvancedFilters } from "./AdvancedFilters";
import { InterpretersList } from "./InterpretersList";
import { eventEmitter, EVENT_CONNECTION_STATUS_CHANGE, EVENT_INTERPRETER_STATUS_UPDATE } from '@/lib/events';
import { useTableSubscription } from "@/hooks/useTableSubscription";
import { v4 as uuidv4 } from 'uuid';

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
  const [todayMissionsCount, setTodayMissionsCount] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isConnected, setIsConnected] = useState(true);
  const { toast } = useToast();
  
  // Listen for connection status changes
  useEffect(() => {
    const handleConnectionStatusChange = (connected: boolean) => {
      setIsConnected(connected);
      if (connected) {
        fetchInterpreters();
      }
    };
    
    eventEmitter.on(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionStatusChange);
    
    return () => {
      eventEmitter.off(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionStatusChange);
    };
  }, []);

  // Direct subscription to interpreter status updates
  useEffect(() => {
    console.log('[InterpretersTab] Setting up direct interpreter status update listener');
    
    const handleInterpreterStatusUpdate = (data: {
      interpreterId: string;
      status: Profile['status'];
      timestamp?: number;
      uuid?: string;
    }) => {
      console.log(`[InterpretersTab] Received status update for interpreter ${data.interpreterId}: ${data.status}`);
      
      setInterpreters(current => 
        current.map(interpreter => 
          interpreter.id === data.interpreterId 
            ? { ...interpreter, status: data.status } 
            : interpreter
        )
      );
    };
    
    eventEmitter.on(EVENT_INTERPRETER_STATUS_UPDATE, handleInterpreterStatusUpdate);
    
    return () => {
      eventEmitter.off(EVENT_INTERPRETER_STATUS_UPDATE, handleInterpreterStatusUpdate);
    };
  }, []);

  // Subscribe to reservation changes using the centralized hook
  useTableSubscription(
    'private_reservations',
    '*',
    null,
    () => {
      console.log('[InterpretersTab] Reservation update detected');
      fetchInterpreters();
      fetchTodayMissions();
    }
  );

  const handleInterpreterStatusChange = async (interpreterId: string, newStatus: Profile['status']) => {
    try {
      console.log(`[InterpretersTab] Status change requested for ${interpreterId} to ${newStatus}`);
      
      // Update our local state immediately for better UX
      setInterpreters(current => 
        current.map(interpreter => 
          interpreter.id === interpreterId 
            ? { ...interpreter, status: newStatus } 
            : interpreter
        )
      );

      // Emit event for better sync across components
      eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
        interpreterId,
        status: newStatus,
        timestamp: Date.now(),
        uuid: uuidv4() // Add unique ID to prevent event deduplication issues
      });

      const interpreter = interpreters.find(i => i.id === interpreterId);
      if (interpreter) {
        toast({
          title: "Statut mis à jour",
          description: `Le statut de ${interpreter.first_name} ${interpreter.last_name} a été mis à jour en ${newStatus}`,
        });
      }
      
      // Update in database
      const { error } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: interpreterId,
        p_status: newStatus
      });
      
      if (error) {
        console.error('[InterpretersTab] Error updating interpreter status:', error);
        throw error;
      }
    } catch (error) {
      console.error('[InterpretersTab] Error updating interpreter status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut de l'interprète",
        variant: "destructive"
      });
      
      // Fetch interpreters again to ensure our state is in sync with the database
      fetchInterpreters();
    }
  };
  
  // Direct subscription to interpreter profile changes for immediate UI updates
  useTableSubscription(
    'interpreter_profiles',
    'UPDATE',
    null, // Use null to catch all updates without filtering
    (payload) => {
      if (payload.new && payload.old && payload.new.status !== payload.old.status) {
        const interpreterId = payload.new.id;
        const newStatus = payload.new.status;
        
        console.log(`[InterpretersTab] DB update detected: Interpreter ${interpreterId} status changed to ${newStatus}`);
        
        setInterpreters(current => 
          current.map(interpreter => 
            interpreter.id === interpreterId 
              ? { ...interpreter, status: newStatus as Profile['status'] } 
              : interpreter
          )
        );
        
        // Broadcast to ensure all components have the latest status
        eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE, {
          interpreterId: interpreterId,
          status: newStatus,
          timestamp: Date.now(),
          uuid: uuidv4()
        });
      }
    }
  );

  useEffect(() => {
    fetchInterpreters();
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchInterpreters();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
        
        // Convertir 'now' en chaîne de date UTC pour la comparaison
        const nowDateString = now.toISOString().split('T')[0];

        // Filtrer pour ne prendre que les réservations d'aujourd'hui et à venir
        const todaysReservations = interpreter.private_reservations?.filter(reservation => {
          if (!reservation?.start_time) return false;
          
          // Extraire la date de début sans heure
          const reservationDate = reservation.start_time.split('T')[0];
          
          // Inclure seulement les réservations pour aujourd'hui et qui sont programmées
          return reservationDate === nowDateString && reservation.status === 'scheduled';
        });
        
        // Trier les réservations par heure de début
        todaysReservations?.sort((a, b) => {
          if (!a.start_time || !b.start_time) return 0;
          return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
        });
        
        // Prendre la première réservation à venir comme prochaine mission
        const nextReservation = todaysReservations && todaysReservations.length > 0 
          ? todaysReservations[0] 
          : null;
        
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
  };

  const fetchTodayMissions = async () => {
    try {
      // Créer des dates pour aujourd'hui sans conversion de fuseau horaire
      const today = new Date();
      const todayDateString = today.toISOString().split('T')[0];
      const todayStart = `${todayDateString}T00:00:00`;
      const todayEnd = `${todayDateString}T23:59:59`;
      
      console.log("[InterpretersTab] Fetching today's missions", todayStart, todayEnd);

      const {
        data: scheduledMissions,
        error: scheduledError
      } = await supabase.from("interpretation_missions").select("id")
        .eq("mission_type", "scheduled")
        .gte("scheduled_start_time", todayStart)
        .lt("scheduled_start_time", todayEnd);
      if (scheduledError) throw scheduledError;

      const {
        data: privateReservations,
        error: reservationsError
      } = await supabase.from("private_reservations").select("id")
        .eq("status", "scheduled")
        .gte("start_time", todayStart)
        .lt("start_time", todayEnd);
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

      {!isConnected && (
        <div className="bg-amber-100 border border-amber-400 text-amber-700 px-4 py-2 rounded-md shadow-sm mb-4 animate-pulse">
          Reconnexion en cours...
        </div>
      )}

      <InterpretersList
        interpreters={filteredInterpreters}
        onStatusChange={handleInterpreterStatusChange}
        viewMode={viewMode}
        key={`interpreters-list-${interpreters.map(i => `${i.id}-${i.status}`).join('-')}`}
      />
    </div>
  );
};
