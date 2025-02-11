
import { Badge } from "./ui/badge";
import { UpcomingMissionBadge } from "./UpcomingMissionBadge";

interface InterpreterCardProps {
  interpreter: {
    id: string;
    name: string;
    status: "available" | "unavailable" | "pause" | "busy";
    employment_status: "salaried_aft" | "salaried_aftcom" | "salaried_planet" | "permanent_interpreter" | "self_employed";
    languages: string[];
    tarif_15min?: number;
    tarif_5min?: number;
    phone_number?: string | null;
    next_mission_start?: string | null;
    next_mission_duration?: number | null;
  };
}

export const InterpreterCard: React.FC<InterpreterCardProps> = ({ interpreter }) => {
  return (
    <div className="p-4 border rounded-lg shadow-sm bg-white space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium">{interpreter.name}</h3>
          <p className="text-sm text-gray-600">
            {interpreter.languages.length > 0 
              ? interpreter.languages.join(', ')
              : "Aucune langue spécifiée"}
          </p>
          {interpreter.tarif_15min && interpreter.tarif_15min > 0 && (
            <p className="text-sm text-gray-600">
              Tarif 15min: {interpreter.tarif_15min}€
            </p>
          )}
          {interpreter.tarif_5min && interpreter.tarif_5min > 0 && (
            <p className="text-sm text-gray-600">
              Tarif 5min: {interpreter.tarif_5min}€
            </p>
          )}
        </div>
        <div className="flex flex-col items-end space-y-2">
          <Badge
            variant={
              interpreter.status === "available"
                ? "success"
                : interpreter.status === "unavailable"
                ? "destructive"
                : interpreter.status === "pause"
                ? "warning"
                : "secondary"
            }
          >
            {interpreter.status === "available"
              ? "Disponible"
              : interpreter.status === "unavailable"
              ? "Indisponible"
              : interpreter.status === "pause"
              ? "En pause"
              : "Occupé"}
          </Badge>
          <Badge variant="outline">
            {interpreter.employment_status === "salaried_aft"
              ? "Salarié AFTrad"
              : interpreter.employment_status === "salaried_aftcom"
              ? "Salarié AFTCOM"
              : interpreter.employment_status === "salaried_planet"
              ? "Salarié PLANET"
              : interpreter.employment_status === "permanent_interpreter"
              ? "Interprète permanent"
              : "Auto-entrepreneur"}
          </Badge>
        </div>
      </div>
      
      {interpreter.phone_number && (
        <p className="text-sm text-gray-600">
          Tél: {interpreter.phone_number}
        </p>
      )}
      
      {interpreter.next_mission_start && (
        <div className="text-sm text-gray-600">
          <UpcomingMissionBadge
            startTime={interpreter.next_mission_start}
            duration={interpreter.next_mission_duration || 0}
          />
        </div>
      )}
    </div>
  );
};
