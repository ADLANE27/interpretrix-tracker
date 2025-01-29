import { useState, useEffect } from "react";
import { InterpreterCard } from "./InterpreterCard";
import { StatusFilter } from "./StatusFilter";
import { Input } from "@/components/ui/input";
import { Search, UserCog } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface Profile {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  languages: string[];
  employment_status: "salaried" | "self_employed";
  status: "available" | "busy" | "pause" | "unavailable";
}

const statusConfig = {
  available: { color: "bg-interpreter-available text-white", label: "Disponible" },
  busy: { color: "bg-interpreter-busy text-white", label: "En appel" },
  pause: { color: "bg-interpreter-pause text-white", label: "En pause" },
  unavailable: { color: "bg-interpreter-unavailable text-white", label: "Indisponible" },
};

export const InterpreterDashboard = () => {
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("interpreter_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Erreur lors du chargement du profil:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger votre profil",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const filteredInterpreters = mockInterpreters.filter(interpreter => {
    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(interpreter.status);
    const matchesSearch = interpreter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interpreter.languages.some(lang => lang.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  if (!profile) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Section */}
        <Card className="p-6 lg:col-span-1">
          <div className="flex items-center gap-4 mb-6">
            <UserCog className="w-8 h-8 text-gray-600" />
            <div>
              <h2 className="text-2xl font-bold">Mon Profil</h2>
              <Badge className={statusConfig[profile.status].color}>
                {statusConfig[profile.status].label}
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Nom complet</p>
              <p className="font-medium">{profile.first_name} {profile.last_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{profile.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Téléphone</p>
              <p className="font-medium">{profile.phone_number || "Non renseigné"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Statut professionnel</p>
              <p className="font-medium">
                {profile.employment_status === "salaried" ? "Salarié" : "Auto-entrepreneur"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Langues</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {profile.languages.map((language) => (
                  <Badge key={language} variant="secondary">
                    {language}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Interpreters List Section */}
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-bold mb-6">Tableau de bord des interprètes</h1>
          
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par nom ou langue..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <StatusFilter
            selectedStatuses={selectedStatuses}
            onStatusChange={handleStatusChange}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {filteredInterpreters.map((interpreter) => (
              <InterpreterCard
                key={interpreter.id}
                interpreter={interpreter}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};