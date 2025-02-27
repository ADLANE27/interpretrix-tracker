import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Euro, Globe, Calendar, ChevronDown, ChevronUp, Clock, LockIcon } from "lucide-react";
import { UpcomingMissionBadge } from "./UpcomingMissionBadge";
import { format, addHours } from "date-fns";
import { fr } from 'date-fns/locale';
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from '@supabase/supabase-js';
import type { PrivateReservation } from "@/types/privateReservation";

interface Mission {
  scheduled_start_time: string;
  scheduled_end_time: string | null;
  estimated_duration: number;
  source_language: string;
  target_language: string;
  mission_type: 'immediate' | 'scheduled';
  status: string;
  is_private_reservation?: boolean;
}

interface DatabaseMission {
  scheduled_start_time: string;
  scheduled_end_time: string | null;
  estimated_duration: number;
  source_language: string;
  target_language: string;
  mission_type: string;
  status: string;
  assigned_interpreter_id: string;
  id: string;
  created_at: string;
  updated_at: string;
  notified_interpreters: string[];
  assignment_time: string | null;
  client_name: string | null;
  created_by: string | null;
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
  const [isInterpreter, setIsInterpreter] = useState(true);

  const checkIfInterpreter = async () => {
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', interpreter.id)
      .single();

    if (roleError) {
      console.error('[InterpreterCard] Error checking role:', roleError);
      return;
    }

    setIsInterpreter(roleData?.role === 'interpreter');
  };

  const initializeData = async () => {
    await Promise.all([
      fetchTarifs(),
      fetchMissions(),
      fetchCurrentStatus()
    ]);
  };

  useEffect(() => {
    console.log('[InterpreterCard] Initial data loading for interpreter:', interpreter.id);
    initializeData();
  }, [interpreter.id]);

  const fetchTarifs = async () => {
    try {
      console.log('[InterpreterCard] Fetching tarifs for interpreter:', interpreter.id);
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
        console.log('[InterpreterCard] Tarifs fetched successfully:', data);
        setLocalTarifs({
          tarif_5min: data.tarif_5min || 0,
          tarif_15min: data.tarif_15min || 0
        });
      }
    } catch (error) {
      console.error('[InterpreterCard] Unexpected error fetching tarifs:', error);
    }
  };

  const fetchMissions = async () => {
    try {
      const { data: regularMissions, error: regularError } = await supabase
        .from('interpretation_missions')
        .select('*')
        .eq('assigned_interpreter_id', interpreter.id)
        .or('status.eq.accepted,status.eq.in_progress')
        .eq('mission_type', 'scheduled')
        .gte('scheduled_end_time', new Date().toISOString());

      if (regularError) throw regularError;

      const transformedRegularMissions: Mission[] = (regularMissions || []).map((mission: DatabaseMission) => ({
        scheduled_start_time: mission.scheduled_start_time,
        scheduled_end_time: mission.scheduled_end_time,
        estimated_duration: mission.estimated_duration,
        source_language: mission.source_language,
        target_language: mission.target_language,
        mission_type: mission.mission_type as 'immediate' | 'scheduled',
        status: mission.status,
        is_private_reservation: false
      }));

      const { data: privateReservations, error: privateError } = await supabase
        .from('private_reservations')
        .select('*')
        .eq('interpreter_id', interpreter.id)
        .eq('status', 'scheduled')
        .gte('end_time', new Date().toISOString());

      if (privateError) throw privateError;

      const transformedPrivateReservations: Mission[] = (privateReservations || []).map(res => ({
        scheduled_start_time: res.start_time,
        scheduled_end_time: res.end_time,
        estimated_duration: res.duration_minutes,
        source_language: res.source_language,
        target_language: res.target_language,
        mission_type: 'scheduled' as const,
        status: res.status,
        is_private_reservation: true
      }));

      const allMissions = [...transformedRegularMissions, ...transformedPrivateReservations]
        .sort((a, b) => new Date(a.scheduled_start_time).getTime() - new Date(b.scheduled_start_time).getTime());

      setMissions(allMissions);

    } catch (error) {
      console.error('[InterpreterCard] Error fetching missions:', error);
    }
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

  useEffect(() => {
    let visibilityTimeout: NodeJS.Timeout;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
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
    console.log('[InterpreterCard] Setting up real-time subscriptions');
    const channels: RealtimeChannel[] = [];

    const missionChannel = supabase.channel(`interpreter-missions-${interpreter.id}`)
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'interpretation_missions',
        filter: `assigned_interpreter_id=eq.${interpreter.id}`,
      }, () => {
        console.log('[InterpreterCard] Mission update received');
        fetchMissions();
      })
      .subscribe();
    channels.push(missionChannel);

    const reservationChannel = supabase.channel(`interpreter-reservations-${interpreter.id}`)
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'private_reservations',
        filter: `interpreter_id=eq.${interpreter.id}`,
      }, () => {
        console.log('[InterpreterCard] Private reservation update received');
        fetchMissions();
      })
      .subscribe();
    channels.push(reservationChannel);

    fetchMissions();

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [interpreter.id]);

  useEffect(() => {
    setCurrentStatus(interpreter.status);
  }, [interpreter.status]);

  if (!isInterpreter) {
    return null;
  }

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

  const adjustForFrenchTime = (dateString: string) => {
    const date = new Date(dateString);
    return addHours(date, -1); // Subtract one hour to compensate for UTC to French time
  };

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
                  {format(adjustForFrenchTime(nextMission.scheduled_start_time), "d MMMM 'à' HH:mm", { locale: fr })}
                  {nextMission.scheduled_end_time && (
                    <> - {format(adjustForFrenchTime(nextMission.scheduled_end_time), "HH:mm", { locale: fr })}</>
                  )}
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
                        {format(adjustForFrenchTime(mission.scheduled_start_time), "d MMMM 'à' HH:mm", { locale: fr })}
                        {mission.scheduled_end_time && (
                          <> - {format(adjustForFrenchTime(mission.scheduled_end_time), "HH:mm", { locale: fr })}</>
                        )}
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
