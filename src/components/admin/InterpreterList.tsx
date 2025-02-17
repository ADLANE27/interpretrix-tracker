
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { InterpreterCard } from "@/components/InterpreterCard";
import { StatusFilter } from "@/components/StatusFilter";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCache } from "@/hooks/use-cache";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import { PaginationList } from "@/components/ui/pagination-list";

interface Interpreter {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  languages: string[];
  employment_status: string;
  tarif_15min: number;
}

export const InterpreterList = () => {
  const [interpreters, setInterpreters] = useState<Interpreter[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const { getCachedData, invalidateCache } = useCache<Interpreter[]>(
    'interpreters',
    fetchInterpreters,
    { ttl: 2 * 60 * 1000 } // 2 minutes cache
  );

  async function fetchInterpreters() {
    try {
      const { data, error } = await supabase
        .from('interpreter_profiles')
        .select('*')
        .order('last_name', { ascending: true });

      if (error) throw error;
      return data as Interpreter[];
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

  useEffect(() => {
    const loadInterpreters = async () => {
      setIsLoading(true);
      const data = await getCachedData();
      setInterpreters(data);
      setIsLoading(false);
    };

    loadInterpreters();
  }, []);

  // Setup realtime subscription
  useRealtimeSubscription(
    {
      event: '*',
      table: 'interpreter_profiles',
    },
    async () => {
      console.log('[InterpreterList] Received update, invalidating cache');
      invalidateCache();
      const freshData = await getCachedData();
      setInterpreters(freshData);
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
