import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Clock, Globe, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { UpcomingMissionBadge } from "./UpcomingMissionBadge";
import { format } from "date-fns";
import { fr } from 'date-fns/locale';
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Mission {
  scheduled_start_time: string;
  scheduled_end_time: string | null;
  estimated_duration: number;
  source_language: string;
  target_language: string;
  mission_type: 'immediate' | 'scheduled';
  status: string;
}

interface InterpreterCardProps {
  interpreter: {
    id: string;
    name: string;
    status: "available" | "unavailable" | "pause" | "busy";
    employment_status: "salaried_aft" | "salaried_aftcom" | "salaried_planet" | "permanent_interpreter" | "self_employed";
    languages: string[];
    tarif_15min?: number | null;
    tarif_5min?: number | null;
    phone_number?: string | null;
    next_mission_start?: string | null;
    next_mission_duration?: number | null;
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
  self_employed: "Auto-entrepreneur",
};

export const InterpreterCard = ({ interpreter }: InterpreterCardProps) => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [showAllMissions, setShowAllMissions] = useState(false);

  useEffect(() => {
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

    fetchMissions();

    const channel = supabase
      .channel('interpreter-missions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interpretation_missions',
          filter: `assigned_interpreter_id=eq.${interpreter.id}`
        },
        (payload) => {
          console.log('[InterpreterCard] Mission update received:', payload);
          fetchMissions();
        }
      )
      .subscribe((status) => {
        console.log('[InterpreterCard] Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
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
          <Badge className={`${statusConfig[interpreter.status].color}`}>
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
        
        {interpreter.tarif_15min != null && interpreter.tarif_15min > 0 && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm">{interpreter.tarif_15min}€/15min</span>
          </div>
        )}

        {interpreter.tarif_5min != null && interpreter.tarif_5min > 0 && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm">{interpreter.tarif_5min}€/5min</span>
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
