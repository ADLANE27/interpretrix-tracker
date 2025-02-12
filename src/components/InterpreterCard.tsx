
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Euro, Globe, Calendar, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { UpcomingMissionBadge } from "./UpcomingMissionBadge";
import { format } from "date-fns";
import { fr } from 'date-fns/locale';
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from '@supabase/supabase-js';

interface Mission {
  scheduled_start_time: string;
  scheduled_end_time: string | null;
  estimated_duration: number;
  source_language: string;
  target_language: string;
  mission_type: 'immediate' | 'scheduled';
  status: string;
}

type InterpreterStatus = "available" | "unavailable" | "pause" | "busy";

interface InterpreterCardProps {
  interpreter: {
    id: string;
    name: string;
    status: InterpreterStatus;
    employment_status: "salaried_aft" | "salaried_aftcom" | "salaried_planet" | "permanent_interpreter" | "self_employed";
    languages: string[];
    tarif_15min?: number | null;
    tarif_5min?: number | null;
    phone_number?: string | null;
    next_mission_start?: string | null;
    next_mission_duration?: number | null;
  };
}

interface InterpreterProfile {
  status: string;
  tarif_5min: number;
  tarif_15min: number;
}

// Add new interfaces for Supabase real-time types
interface RealtimePostgresUpdatePayload {
  commit_timestamp: string;
  errors: null | any[];
  old: { [key: string]: any } | null;
  new: { [key: string]: any } | null;
  schema: string;
  table: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
}

interface RealtimeInterpreterProfilePayload extends RealtimePostgresUpdatePayload {
  new: {
    status: string;
    [key: string]: any;
  } | null;
}

const statusConfig = {
  available: { color: "bg-interpreter-available text-white", label: "Disponible" },
  unavailable: { color: "bg-interpreter-unavailable text-white", label: "Indisponible" },
  pause: { color: "bg-interpreter-pause text-white", label: "En pause" },
  busy: { color: "bg-interpreter-busy text-white", label: "En appel" },
};

const employmentStatusLabels: Record<string, string> = {
  salaried_aft: "Salarié AFTrad",
  salaried_aftcom: "Salarié AFTCOM",
  salaried_planet: "Salarié PLANET",
  permanent_interpreter: "Interprète permanent",
  self_employed: "Auto-entrepreneur",
};

const isValidStatus = (status: string): status is InterpreterStatus => {
  return ['available', 'unavailable', 'pause', 'busy'].includes(status);
};

export const InterpreterCard = ({ interpreter }: InterpreterCardProps) => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [showAllMissions, setShowAllMissions] = useState(false);
  const [localTarifs, setLocalTarifs] = useState({
    tarif_5min: 0,
    tarif_15min: 0
  });
  const [currentStatus, setCurrentStatus] = useState<InterpreterStatus>(interpreter.status);
  const [isOnline, setIsOnline] = useState(true);

  // Define fetchTarifs before using it
  const fetchTarifs = async () => {
    const { data, error } = await supabase
      .from('interpreter_profiles')
      .select('tarif_5min, tarif_15min')
      .eq('id', interpreter.id)
      .single();

    if (error) {
      console.error('[InterpreterCard] Error fetching tarifs:', error);
      return;
    }

    if (data) {
      setLocalTarifs({
        tarif_5min: data.tarif_5min,
        tarif_15min: data.tarif_15min
      });
    }
  };

  // Define fetchMissions before using it
  const fetchMissions = async () => {
    const { data, error } = await supabase
      .from('interpretation_missions')
      .select('*')
      .eq('assigned_interpreter_id', interpreter.id)
      .eq('status', 'accepted')
      .eq('mission_type', 'scheduled')
      .gte('scheduled_start_time', new Date().toISOString())
      .order('scheduled_start_time', { ascending: true });

    if (error) {
      console.error('[InterpreterCard] Error fetching missions:', error);
      return;
    }

    const typedMissions = (data || []).map(mission => ({
      scheduled_start_time: mission.scheduled_start_time,
      scheduled_end_time: mission.scheduled_end_time,
      estimated_duration: mission.estimated_duration,
      source_language: mission.source_language,
      target_language: mission.target_language,
      mission_type: mission.mission_type as 'immediate' | 'scheduled',
      status: mission.status
    }));

    setMissions(typedMissions);
  };

  const fetchCurrentStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('interpreter_profiles')
        .select('status')
        .eq('id', interpreter.id)
        .single();

      if (error) throw error;
      if (data && isValidStatus(data.status)) {
        setCurrentStatus(data.status);
      }
    } catch (error) {
      console.error('[InterpreterCard] Error fetching current status:', error);
    }
  };

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle visibility changes
  useEffect(() => {
    let visibilityTimeout: NodeJS.Timeout;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh data when tab becomes visible
        fetchTarifs();
        fetchMissions();
        fetchCurrentStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityTimeout) clearTimeout(visibilityTimeout);
    };
  }, [interpreter.id]);

  useEffect(() => {
    fetchTarifs();
  }, [interpreter.id]);

  useEffect(() => {
    console.log('[InterpreterCard] Initial tariffs:', {
      tarif_5min: {
        value: interpreter.tarif_5min,
        type: typeof interpreter.tarif_5min,
        isValid: typeof interpreter.tarif_5min === 'number' && interpreter.tarif_5min > 0
      },
      tarif_15min: {
        value: interpreter.tarif_15min,
        type: typeof interpreter.tarif_15min,
        isValid: typeof interpreter.tarif_15min === 'number' && interpreter.tarif_15min > 0
      },
      interpreter_id: interpreter.id
    });

    // Set up real-time subscriptions with proper channel configuration
    const statusChannel = supabase.channel(`interpreter-status-${interpreter.id}`, {
      config: {
        broadcast: { self: true },
        presence: { key: interpreter.id },
      },
    });

    const missionChannel = supabase.channel(`interpreter-missions-${interpreter.id}`, {
      config: {
        broadcast: { self: true },
        presence: { key: interpreter.id },
      },
    });

    // Subscribe to status changes
    statusChannel
      .on('postgres_changes' as any, {
        event: 'UPDATE',
        schema: 'public',
        table: 'interpreter_profiles',
        filter: `id=eq.${interpreter.id}`,
      }, (payload: RealtimeInterpreterProfilePayload) => {
        console.log('[InterpreterCard] Status update received:', payload);
        if (payload.new && typeof payload.new.status === 'string' && isValidStatus(payload.new.status)) {
          setCurrentStatus(payload.new.status);
        }
      })
      .subscribe((status) => {
        console.log('[InterpreterCard] Status subscription status:', status);
      });

    // Subscribe to mission changes
    missionChannel
      .on('postgres_changes' as any, {
        event: 'UPDATE',
        schema: 'public',
        table: 'interpretation_missions',
        filter: `assigned_interpreter_id=eq.${interpreter.id}`,
      }, (payload: RealtimePostgresUpdatePayload) => {
        console.log('[InterpreterCard] Mission update received:', payload);
        fetchMissions();
      })
      .subscribe((status) => {
        console.log('[InterpreterCard] Mission subscription status:', status);
      });

    // Initial data fetch
    fetchMissions();
    fetchCurrentStatus();

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(missionChannel);
    };
  }, [interpreter.id]);

  const nextMission = missions[0];
  const additionalMissions = missions.slice(1);
  const hasAdditionalMissions = additionalMissions.length > 0;

  const parseLanguages = (languages: string[] | undefined | null) => {
    if (!languages || !Array.isArray(languages)) return [];
    
    return languages
      .filter(lang => {
        if (!lang || typeof lang !== 'string') return false;
        const [source, target] = lang.split('→').map(part => part.trim());
        return source && target && !source.includes('undefined') && !target.includes('undefined');
      })
      .map(lang => {
        const [source, target] = lang.split('→').map(part => part.trim());
        return { source, target };
      });
  };

  const parsedLanguages = parseLanguages(interpreter.languages);

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg">{interpreter.name}</h3>
          <Badge variant="outline" className="mt-1">
            {employmentStatusLabels[interpreter.employment_status]}
          </Badge>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge className={`${statusConfig[currentStatus].color} relative`}>
            {!isOnline && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
            {statusConfig[currentStatus].label}
          </Badge>
          {nextMission && (
            <UpcomingMissionBadge
              startTime={nextMission.scheduled_start_time}
              estimatedDuration={nextMission.estimated_duration}
            />
          )}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-gray-500" />
          <div className="flex flex-wrap gap-1">
            {parsedLanguages.length > 0 ? (
              parsedLanguages.map((lang, index) => (
                <div key={index} className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {lang.source}
                  </Badge>
                  <span className="text-xs">→</span>
                  <Badge variant="secondary" className="text-xs">
                    {lang.target}
                  </Badge>
                </div>
              ))
            ) : (
              <span className="text-sm text-gray-500">Aucune langue spécifiée</span>
            )}
          </div>
        </div>

        {interpreter.phone_number && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-500" />
            <span className="text-sm">{interpreter.phone_number}</span>
          </div>
        )}

        <div className="space-y-1">
          {localTarifs.tarif_15min > 0 && (
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{localTarifs.tarif_15min}€/15min</span>
            </div>
          )}

          {localTarifs.tarif_5min > 0 && (
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{localTarifs.tarif_5min}€/5min</span>
            </div>
          )}
        </div>

        {nextMission && (
          <div className="mt-4 border-t pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-700">Missions programmées</h4>
              {hasAdditionalMissions && (
                <button
                  onClick={() => setShowAllMissions(!showAllMissions)}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {showAllMissions ? (
                    <>
                      Voir moins
                      <ChevronUp className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      +{additionalMissions.length} mission{additionalMissions.length > 1 ? 's' : ''}
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm">
                  {format(new Date(nextMission.scheduled_start_time), "d MMMM à HH:mm", { locale: fr })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm">
                  Durée: {nextMission.estimated_duration} minutes
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-500" />
                <span className="text-sm">
                  {nextMission.source_language} → {nextMission.target_language}
                </span>
              </div>
            </div>

            {showAllMissions && additionalMissions.length > 0 && (
              <div className="mt-4 space-y-4">
                {additionalMissions.map((mission, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-md space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">
                        {format(new Date(mission.scheduled_start_time), "d MMMM à HH:mm", { locale: fr })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">
                        Durée: {mission.estimated_duration} minutes
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">
                        {mission.source_language} → {mission.target_language}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
