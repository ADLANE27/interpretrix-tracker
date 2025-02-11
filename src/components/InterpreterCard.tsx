
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
