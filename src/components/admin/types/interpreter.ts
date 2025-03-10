
import { EmploymentStatus } from "@/types/employment";

interface WorkHours {
  start_morning: string;
  end_morning: string;
  start_afternoon: string;
  end_afternoon: string;
}

export interface Interpreter {
  id: string;
  first_name: string;
  last_name: string;
  status: "available" | "unavailable" | "pause" | "busy";
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
  connection_status?: "available" | "unavailable" | "pause" | "busy";
}
