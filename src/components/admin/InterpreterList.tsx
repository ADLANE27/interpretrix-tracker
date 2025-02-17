
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { InterpreterCard } from "@/components/InterpreterCard";
import { StatusFilter } from "@/components/StatusFilter";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCache } from "@/hooks/use-cache";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import { PaginationList } from "@/components/ui/pagination-list";

interface InterpreterData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  languages: string[];
  employment_status: string;
  tarif_15min: number;
  phone_number?: string;
  next_mission_start?: string;
  next_mission_duration?: number;
}

interface FormattedInterpreter {
  id: string;
  name: string;
  status: "available" | "unavailable" | "pause" | "busy";
  employment_status: "salaried_aft" | "salaried_aftcom" | "salaried_planet" | "self_employed" | "permanent_interpreter";
  languages: string[];
  tarif_15min?: number;
  phone_number?: string;
  next_mission_start?: string;
  next_mission_duration?: number;
}

export const InterpreterList = () => {
  const [interpreters, setInterpreters] = useState<FormattedInterpreter[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const { getCachedData, invalidateCache } = useCache<InterpreterData[]>(
    'interpreters',
    fetchInterpreters,
    { ttl: 2 * 60 * 1000 }
  );

  async function fetchInterpreters() {
    try {
      const { data, error } = await supabase
        .from('interpreter_profiles')
        .select('*')
        .order('last_name', { ascending: true });

      if (error) throw error;
      return data as InterpreterData[];
    } catch (error) {
      console.error('Error fetching interpreters:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des interprètes",
        variant: "destructive",
      });
      return [];
    }
  }

  const formatInterpreter = (interpreter: InterpreterData): FormattedInterpreter => ({
    id: interpreter.id,
    name: `${interpreter.first_name} ${interpreter.last_name}`,
    status: interpreter.status as "available" | "unavailable" | "pause" | "busy",
    employment_status: interpreter.employment_status as "salaried_aft" | "salaried_aftcom" | "salaried_planet" | "self_employed" | "permanent_interpreter",
    languages: interpreter.languages,
    tarif_15min: interpreter.tarif_15min,
    phone_number: interpreter.phone_number,
    next_mission_start: interpreter.next_mission_start,
    next_mission_duration: interpreter.next_mission_duration
  });

  useEffect(() => {
    const loadInterpreters = async () => {
      setIsLoading(true);
      const data = await getCachedData();
      setInterpreters(data.map(formatInterpreter));
      setIsLoading(false);
    };

    loadInterpreters();
  }, []);

  useRealtimeSubscription(
    {
      event: '*',
      table: 'interpreter_profiles',
    },
    async () => {
      console.log('[InterpreterList] Received update, invalidating cache');
      invalidateCache();
      const freshData = await getCachedData();
      setInterpreters(freshData.map(formatInterpreter));
    },
    {
      onError: (error) => {
        console.error('Realtime subscription error:', error);
        toast({
          title: "Erreur de connexion",
          description: "La mise à jour en temps réel est temporairement indisponible",
          variant: "destructive",
        });
      }
    }
  );

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
        data={filteredInterpreters}
        pageSize={10}
        pageSizeOptions={[5, 10, 20, 50]}
        renderItem={(interpreter) => (
          <InterpreterCard
            key={interpreter.id}
            interpreter={interpreter}
          />
        )}
        keyExtractor={(interpreter) => interpreter.id}
        isLoading={isLoading}
        className="mt-4"
      />
    </div>
  );
};
