import { useEffect, useState } from "react";
import { InterpreterCard } from "../InterpreterCard";
import { StatusFilter } from "../StatusFilter";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Interpreter {
  id: string;
  first_name: string;
  last_name: string;
  status: "available" | "unavailable" | "pause" | "busy";
  employment_status: "salaried" | "self_employed";
  languages: string[];
  phone_interpretation_rate: number | null;
  phone_number: string | null;
}

export const AdminDashboard = () => {
  const [interpreters, setInterpreters] = useState<Interpreter[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [nameFilter, setNameFilter] = useState("");
  const [sourceLanguageFilter, setSourceLanguageFilter] = useState("");
  const [targetLanguageFilter, setTargetLanguageFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [employmentStatusFilter, setEmploymentStatusFilter] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchInterpreters();
    subscribeToUpdates();
  }, []);

  const validateStatus = (status: string | null): "available" | "unavailable" | "pause" | "busy" => {
    const validStatuses = ["available", "unavailable", "pause", "busy"];
    return (status && validStatuses.includes(status) ? status : "unavailable") as Interpreter["status"];
  };

  const mapDatabaseToInterpreter = (data: any[]): Interpreter[] => {
    return data.map(item => ({
      id: item.id,
      first_name: item.first_name,
      last_name: item.last_name,
      status: validateStatus(item.status),
      employment_status: item.employment_status,
      languages: item.languages,
      phone_interpretation_rate: item.phone_interpretation_rate,
      phone_number: item.phone_number,
    }));
  };

  const fetchInterpreters = async () => {
    try {
      const { data, error } = await supabase
        .from("interpreter_profiles")
        .select("*");

      if (error) throw error;
      setInterpreters(mapDatabaseToInterpreter(data || []));
    } catch (error) {
      console.error("Error fetching interpreters:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des interprètes",
        variant: "destructive",
      });
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel('interpreter-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interpreter_profiles'
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setInterpreters(prev => 
              prev.map(interpreter => 
                interpreter.id === payload.new.id 
                  ? { ...interpreter, ...mapDatabaseToInterpreter([payload.new])[0] }
                  : interpreter
              )
            );
            toast({
              title: "Mise à jour",
              description: `Le statut de ${payload.new.first_name} ${payload.new.last_name} a été mis à jour`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const filteredInterpreters = interpreters.filter(interpreter => {
    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(interpreter.status);
    const matchesName = nameFilter === "" || 
      `${interpreter.first_name} ${interpreter.last_name}`
        .toLowerCase()
        .includes(nameFilter.toLowerCase());
    
    const matchesSourceLanguage = sourceLanguageFilter === "" || 
      interpreter.languages.some(lang => {
        const [source] = lang.split(" → ");
        return source.toLowerCase().includes(sourceLanguageFilter.toLowerCase());
      });

    const matchesTargetLanguage = targetLanguageFilter === "" || 
      interpreter.languages.some(lang => {
        const [, target] = lang.split(" → ");
        return target && target.toLowerCase().includes(targetLanguageFilter.toLowerCase());
      });

    const matchesPhone = phoneFilter === "" || 
      (interpreter.phone_number && 
       interpreter.phone_number.toLowerCase().includes(phoneFilter.toLowerCase()));

    const matchesEmploymentStatus = employmentStatusFilter === "" || 
      interpreter.employment_status === employmentStatusFilter;

    return matchesStatus && 
           matchesName && 
           matchesSourceLanguage && 
           matchesTargetLanguage && 
           matchesPhone && 
           matchesEmploymentStatus;
  });

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Tableau de bord administrateur</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="space-y-2">
          <Label htmlFor="name-search">Nom</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="name-search"
              placeholder="Rechercher par nom..."
              className="pl-10"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="source-language">Langue source</Label>
          <Input
            id="source-language"
            placeholder="Ex: Français"
            value={sourceLanguageFilter}
            onChange={(e) => setSourceLanguageFilter(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="target-language">Langue cible</Label>
          <Input
            id="target-language"
            placeholder="Ex: Anglais"
            value={targetLanguageFilter}
            onChange={(e) => setTargetLanguageFilter(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone-search">Numéro de téléphone</Label>
          <Input
            id="phone-search"
            placeholder="Rechercher par téléphone..."
            value={phoneFilter}
            onChange={(e) => setPhoneFilter(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="employment-status">Statut professionnel</Label>
          <Select
            value={employmentStatusFilter}
            onValueChange={setEmploymentStatusFilter}
          >
            <SelectTrigger id="employment-status">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous les statuts</SelectItem>
              <SelectItem value="salaried">Salarié</SelectItem>
              <SelectItem value="self_employed">Auto-entrepreneur</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <StatusFilter
        selectedStatuses={selectedStatuses}
        onStatusChange={handleStatusChange}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {filteredInterpreters.map((interpreter) => (
          <InterpreterCard
            key={interpreter.id}
            interpreter={{
              id: interpreter.id,
              name: `${interpreter.first_name} ${interpreter.last_name}`,
              status: interpreter.status,
              type: interpreter.employment_status === "salaried" ? "internal" : "external",
              languages: interpreter.languages,
              hourlyRate: interpreter.phone_interpretation_rate,
            }}
          />
        ))}
      </div>
    </div>
  );
};