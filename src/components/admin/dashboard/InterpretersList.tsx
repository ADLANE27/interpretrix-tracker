
import React, { memo } from "react";
import InterpreterCard from "@/components/InterpreterCard";
import { InterpreterListItem } from "@/components/admin/interpreter/InterpreterListItem";
import { Profile } from "@/types/profile";
import { WorkLocation } from "@/utils/workLocationStatus";
import { EmploymentStatus } from "@/utils/employmentStatus";

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
  tarif_15min: number | null;
  tarif_5min: number | null;
  last_seen_at: string | null;
  booth_number?: string | null;
  private_phone?: string | null;
  professional_phone?: string | null;
  landline_phone?: string | null;
  work_hours?: {
    start_morning?: string;
    end_morning?: string;
    start_afternoon?: string;
    end_afternoon?: string;
  } | null;
  work_location?: WorkLocation | null;
  next_mission_source_language?: string | null;
  next_mission_target_language?: string | null;
}

interface InterpretersListProps {
  interpreters: Interpreter[];
  onStatusChange: (interpreterId: string, newStatus: Profile['status']) => void;
  viewMode?: "grid" | "list";
}

// Memoize the individual list item to prevent unnecessary re-renders
const MemoizedInterpreterListItem = memo(InterpreterListItem);
const MemoizedInterpreterCard = memo(InterpreterCard);

export const InterpretersList: React.FC<InterpretersListProps> = ({
  interpreters,
  onStatusChange,
  viewMode = "grid"
}) => {
  if (viewMode === "list") {
    return (
      <div className="space-y-2">
        {interpreters.map(interpreter => (
          <MemoizedInterpreterListItem 
            key={`${interpreter.id}-${interpreter.status}`}
            interpreter={{
              id: interpreter.id,
              name: `${interpreter.first_name} ${interpreter.last_name}`,
              status: interpreter.status || "unavailable",
              employment_status: interpreter.employment_status,
              languages: interpreter.languages,
              phone_number: interpreter.phone_number,
              next_mission_start: interpreter.next_mission_start,
              next_mission_duration: interpreter.next_mission_duration,
              booth_number: interpreter.booth_number,
              private_phone: interpreter.private_phone,
              professional_phone: interpreter.professional_phone,
              landline_phone: interpreter.landline_phone,
              work_hours: interpreter.work_hours,
              work_location: interpreter.work_location as WorkLocation
            }}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {interpreters.map(interpreter => (
        <div key={`${interpreter.id}-${interpreter.status}`} className="h-auto">
          <MemoizedInterpreterCard 
            interpreter={{
              id: interpreter.id,
              name: `${interpreter.first_name} ${interpreter.last_name}`,
              status: interpreter.status || "unavailable",
              employment_status: interpreter.employment_status,
              languages: interpreter.languages,
              tarif_15min: interpreter.tarif_15min || null,
              tarif_5min: interpreter.tarif_5min || null,
              phone_number: interpreter.phone_number,
              next_mission_start: interpreter.next_mission_start,
              next_mission_duration: interpreter.next_mission_duration,
              next_mission_source_language: interpreter.next_mission_source_language,
              next_mission_target_language: interpreter.next_mission_target_language,
              booth_number: interpreter.booth_number,
              private_phone: interpreter.private_phone,
              professional_phone: interpreter.professional_phone,
              landline_phone: interpreter.landline_phone,
              work_hours: interpreter.work_hours,
              work_location: interpreter.work_location as WorkLocation
            }} 
            onStatusChange={onStatusChange}
          />
        </div>
      ))}
    </div>
  );
};
