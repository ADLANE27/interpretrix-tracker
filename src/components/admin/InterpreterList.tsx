
import React from "react";
import { Card } from "@/components/ui/card";
import { InterpreterCard } from "@/components/InterpreterCard";
import { StatusFilter } from "@/components/StatusFilter";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCache } from "@/hooks/use-cache";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import { PaginationList } from "@/components/ui/pagination-list";

interface InterpreterListProps {
  interpreters: UserData[];
  onToggleStatus: (userId: string, currentActive: boolean) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onEditUser: (user: UserData) => void;
  onResetPassword: (userId: string) => void;
}

interface UserData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  active: boolean;
  role: "admin" | "interpreter";
  tarif_15min: number;
  tarif_5min: number;
  employment_status: "salaried_aft" | "salaried_aftcom" | "salaried_planet" | "self_employed" | "permanent_interpreter";
  languages?: string[];
  status?: string;
}

export const InterpreterList: React.FC<InterpreterListProps> = ({
  interpreters,
  onToggleStatus,
  onDeleteUser,
  onEditUser,
  onResetPassword,
}) => {
  const [selectedStatus, setSelectedStatus] = React.useState<string | null>(null);
  const { toast } = useToast();

  const formatInterpreterForDisplay = (interpreter: UserData) => {
    const validLanguages = Array.isArray(interpreter.languages) 
      ? interpreter.languages.filter((lang: string) => {
          if (!lang || typeof lang !== 'string') return false;
          const [source, target] = lang.split('→').map(part => part.trim());
          return source && target && !source.includes('undefined') && !target.includes('undefined');
        })
      : [];

    return {
      id: interpreter.id,
      name: `${interpreter.first_name} ${interpreter.last_name}`,
      email: interpreter.email,
      status: interpreter.status as "available" | "unavailable" | "pause" | "busy" || "available",
      employment_status: interpreter.employment_status,
      languages: validLanguages,
      hourlyRate: (interpreter.tarif_15min || 0) * 4,
      active: interpreter.active
    };
  };

  const filteredInterpreters = selectedStatus
    ? interpreters.filter(interpreter => interpreter.status === selectedStatus)
    : interpreters;

  return (
    <div className="space-y-4">
      <StatusFilter
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
      />

      <PaginationList
        data={filteredInterpreters.map(formatInterpreterForDisplay)}
        pageSize={10}
        pageSizeOptions={[5, 10, 20, 50]}
        renderItem={(interpreter) => (
          <InterpreterCard
            interpreter={interpreter}
            onToggleStatus={() => onToggleStatus(interpreter.id, interpreter.active)}
            onDelete={() => onDeleteUser(interpreter.id)}
            onEdit={() => onEditUser(interpreter)}
            onResetPassword={() => onResetPassword(interpreter.id)}
          />
        )}
        keyExtractor={(interpreter) => interpreter.id}
        className="mt-4"
      />
    </div>
  );
};
