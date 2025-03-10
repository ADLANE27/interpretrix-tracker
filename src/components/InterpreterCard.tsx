import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Euro, Globe, Calendar, ChevronDown, ChevronUp, Clock, DoorClosed } from "lucide-react";
import { UpcomingMissionBadge } from "./UpcomingMissionBadge";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTimeFormat } from "@/hooks/useTimeFormat";
import { useTimestampFormat } from "@/hooks/useTimestampFormat";
import { RealtimeChannel } from '@supabase/supabase-js';
import { useMissionUpdates } from '@/hooks/useMissionUpdates';
import { Profile } from "@/types/profile";
import { EmploymentStatus, employmentStatusLabels } from "@/types/employment";

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

interface WorkHours {
  start_morning: string;
  end_morning: string;
  start_afternoon: string;
  end_afternoon: string;
}

interface InterpreterCardProps {
  interpreter: {
    id: string;
    name: string;
    status: InterpreterStatus;
    employment_status: EmploymentStatus;
    languages: string[];
    tarif_15min?: number | null;
    tarif_5min?: number | null;
    phone_number?: string | null;
    next_mission_start?: string | null;
    next_mission_duration?: number | null;
    booth_number?: string | null;
    private_phone?: string | null;
    professional_phone?: string | null;
    work_hours?: WorkHours | null;
  };
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
  self_employed: "Externe",
};

const isValidStatus = (status: string): status is InterpreterStatus => {
  return ['available', 'unavailable', 'pause', 'busy'].includes(status);
};

const InterpreterCard = ({ interpreter }: InterpreterCardProps) => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [showAllMissions, setShowAllMissions] = useState(false);
  const [localTarifs, setLocalTarifs] = useState({
    tarif_5min: 0,
    tarif_15min: 0
  });
  const [isOnline, setIsOnline] = useState(true);
  const [isInterpreter, setIsInterpreter] = useState(true);
  const [connectionUpdatedAt, setConnectionUpdatedAt] = useState<string | null>(null);

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
      fetchCurrentStatus(),
      fetchConnectionTimestamp()
    ]);
  };

  const fetchConnectionTimestamp = async () => {
    try {
      const { data, error } = await supabase
        .from('interpreter_connection_status')
        .select('updated_at, connection_status')
        .eq('interpreter_id', interpreter.id)
        .single();

      if (error) {
        console.error('[InterpreterCard] Error fetching connection timestamp:', error);
        return;
      }

      if (data) {
        setConnectionUpdatedAt(data.updated_at);
      }
    } catch (error) {
      console.error('[InterpreterCard] Error fetching connection timestamp:', error);
    }
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
      
      // We don't need to set local status anymore since we use interpreter.status directly
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

    // Mission channel subscription
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

    // New connection status channel subscription
    const connectionStatusChannel = supabase.channel(`interpreter-connection-${interpreter.id}`)
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'interpreter_connection_status',
        filter: `interpreter_id=eq.${interpreter.id}`,
      }, () => {
        console.log('[InterpreterCard] Connection status update received');
        fetchConnectionTimestamp();
      })
      .subscribe();
    channels.push(connectionStatusChannel);

    fetchMissions();

    return () => {
      console.log('[InterpreterCard] Cleaning up subscriptions');
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [interpreter.id]);

  useEffect(() => {
  }, [interpreter.status]);

  useMissionUpdates(() => {
    console.log('[InterpreterCard] Updating missions for interpreter:', interpreter.id);
    fetchMissions();
  });

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

  const { getTimeFromString, getDateDisplay } = useTimeFormat();
  const { formatLastSeen } = useTimestampFormat();

  const getCurrentDay = () => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date().getDay()];
  };

  const formatWorkHours = (hours: Partial<WorkHours> | null | undefined) => {
    if (!hours) return 'Horaires non définis';
    
    const morning = hours.start_morning && hours.end_morning 
      ? `${hours.start_morning} - ${hours.end_morning}`
      : '';
    const afternoon = hours.start_afternoon && hours.end_afternoon 
      ? `${hours.start_afternoon} - ${hours.end_afternoon}`
      : '';

    if (!morning && !afternoon) return 'Horaires non définis';
    if (!afternoon) return morning;
    if (!morning) return afternoon;
    return `${morning}, ${afternoon}`;
  };

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg">{interpreter.name}</h3>
          <Badge variant="outline" className="mt-1">
            {employmentStatusLabels[interpreter.employment_status]}
          </Badge>
          <div className="mt-2 text-sm text-muted-foreground">
            {formatLastSeen(connectionUpdatedAt)}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge className={`${statusConfig[interpreter.status].color} relative`}>
            {!isOnline && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
            {statusConfig[interpreter.status].label}
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

        {interpreter.booth_number && (
          <div className="flex items-center gap-2">
            <DoorClosed className="h-4 w-4 text-gray-500" />
            <span className="text-sm">Cabine: {interpreter.booth_number}</span>
          </div>
        )}

        {interpreter.private_phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-500" />
            <span className="text-sm">Tél. personnel: {interpreter.private_phone}</span>
          </div>
        )}

        {interpreter.professional_phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-500" />
            <span className="text-sm">Tél. pro: {interpreter.professional_phone}</span>
          </div>
        )}

        {interpreter.work_hours && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm">
              {formatWorkHours(interpreter.work_hours)}
            </span>
          </div>
        )}

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
                  {getDateDisplay(nextMission.scheduled_start_time)} de{' '}
                  {getTimeFromString(nextMission.scheduled_start_time)}
                  {nextMission.scheduled_end_time && (
                    <> à {getTimeFromString(nextMission.scheduled_end_time)}</>
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
                        {getDateDisplay(mission.scheduled_start_time)} de{' '}
                        {getTimeFromString(mission.scheduled_start_time)}
                        {mission.scheduled_end_time && (
                          <> à {getTimeFromString(mission.scheduled_end_time)}</>
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

export default InterpreterCard;

