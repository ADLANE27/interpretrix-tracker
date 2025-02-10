
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Clock, Globe, Calendar, ArrowRightLeft, ChevronDown, ChevronUp } from "lucide-react";
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
  client_name: string | null;
  mission_type: 'immediate' | 'scheduled';
  status: string;
}

interface InterpreterCardProps {
  interpreter: {
    id: string;
    name: string;
    status: "available" | "unavailable" | "pause" | "busy";
    type: "internal" | "external";
    languages: string[];
    hourlyRate?: number;
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

export const InterpreterCard = ({ interpreter }: InterpreterCardProps) => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllMissions, setShowAllMissions] = useState(false);

  useEffect(() => {
    // Initial fetch of missions
    const fetchMissions = async () => {
      const { data, error } = await supabase
        .from('interpretation_missions')
        .select('*')
        .eq('assigned_interpreter_id', interpreter.id)
        .eq('status', 'accepted')
        .gte('scheduled_start_time', new Date().toISOString())
        .order('scheduled_start_time', { ascending: true });

      if (error) {
        console.error('[InterpreterCard] Error fetching missions:', error);
        return;
      }

      setMissions(data || []);
    };

    fetchMissions();

    // Subscribe to real-time updates
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
          fetchMissions(); // Refresh missions when changes occur
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

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg">{interpreter.name}</h3>
          <Badge variant="outline" className="mt-1">
            {interpreter.type === "internal" ? "Salarié" : "Freelance"}
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
            {interpreter.languages.map((lang, index) => {
              const [source, target] = lang.split(" → ");
              return (
                <div key={index} className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {source}
                  </Badge>
                  <span className="text-xs">→</span>
                  <Badge variant="secondary" className="text-xs">
                    {target}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        {interpreter.phone_number && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-500" />
            <span className="text-sm">{interpreter.phone_number}</span>
          </div>
        )}
        
        {interpreter.type === "external" && interpreter.hourlyRate && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm">{interpreter.hourlyRate}€/h</span>
          </div>
        )}

        {/* Next Mission Details Section */}
        {nextMission && (
          <div className="mt-4 border-t pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-700">Prochaine mission</h4>
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

            {/* Next Mission */}
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
              {nextMission.client_name && (
                <div className="text-sm text-gray-600">
                  Client: {nextMission.client_name}
                </div>
              )}
              <Badge variant="secondary">
                {nextMission.mission_type === 'immediate' ? 'Immédiate' : 'Programmée'}
              </Badge>
            </div>

            {/* Additional Missions */}
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
                    {mission.client_name && (
                      <div className="text-sm text-gray-600">
                        Client: {mission.client_name}
                      </div>
                    )}
                    <Badge variant="secondary">
                      {mission.mission_type === 'immediate' ? 'Immédiate' : 'Programmée'}
                    </Badge>
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
