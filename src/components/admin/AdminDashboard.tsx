import { useEffect, useState } from "react";
import { InterpreterCard } from "../InterpreterCard";
import { StatusFilter } from "../StatusFilter";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CountrySelect } from "../CountrySelect";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MissionManagement } from "./MissionManagement";

const LANGUAGES = [
  // Langues européennes
  "Français", "Anglais (UK)", "Anglais (US)", "Espagnol", "Allemand", "Italien", "Portugais",
  "Néerlandais", "Grec", "Russe", "Ukrainien", "Polonais", "Roumain", "Bulgare", "Hongrois",
  "Tchèque", "Slovaque", "Croate", "Serbe", "Albanais", "Macédonien", "Lituanien", "Letton",
  "Estonien", "Finnois", "Suédois", "Norvégien", "Danois", "Islandais",
  
  // Langues d'Afrique
  "Zaghawa", "Four", "Amharique", "Tigrigna", "Oromo", "Somali", "Swahili",
  "Lingala", "Kikongo", "Tshiluba", "Kinyarwanda", "Kirundi", "Wolof", "Bambara",
  "Peul", "Haoussa", "Yoruba", "Igbo", "Soninké", "Dioula", "Malinké", "Moore",
  "Sérère", "Bété", "Baoulé", "Éwé", "Mina", "Fon", "Berbère (Kabyle)", 
  "Berbère (Chleuh)", "Berbère (Rifain)", "Tamasheq",
  
  // Langues d'Asie
  "Mandarin", "Cantonais", "Wu (Shanghaïen)", "Min Nan", "Hakka",
  "Japonais", "Coréen", "Vietnamien", "Khmer", "Lao", "Thaï",
  "Birman", "Tibétain", "Népalais", "Cinghalais", "Tamoul", "Hindi",
  "Ourdou", "Bengali", "Punjabi", "Gujarati", "Marathi", "Malayalam",
  "Télougou", "Kannada", "Indonésien", "Malais", "Tagalog", "Cebuano",
  
  // Langues du Moyen-Orient et d'Asie centrale
  "Arabe (Standard)", "Arabe (Maghrébin)", "Arabe (Égyptien)", 
  "Arabe (Levant)", "Arabe (Golfe)", "Arabe (Irakien)", "Arabe (Yéménite)",
  "Persan (Iran)", "Dari (Afghanistan)", "Pachto", "Kurde (Kurmandji)",
  "Kurde (Sorani)", "Azéri", "Ouzbek", "Kazakh", "Kirghize", "Tadjik",
  "Turkmène", "Ouïghour", "Arménien", "Géorgien",
  
  // Langues des signes
  "Langue des Signes Française (LSF)", "American Sign Language (ASL)",
  "British Sign Language (BSL)", "Deutsche Gebärdensprache (DGS)",
  "Langue des Signes Québécoise (LSQ)", "International Sign",
  
  // Langues créoles
  "Créole Haïtien", "Créole Réunionnais", "Créole Mauricien",
  "Créole Guadeloupéen", "Créole Martiniquais", "Créole Seychellois",
  "Créole Guyanais", "Papiamento",
  
  // Langues autochtones d'Amérique
  "Quechua", "Aymara", "Guarani", "Nahuatl", "Maya", "Inuktitut",
  
  // Langues du Pacifique
  "Hawaiien", "Maori", "Samoan", "Tahitien", "Fidjien"
];

interface Interpreter {
  id: string;
  first_name: string;
  last_name: string;
  status: "available" | "unavailable" | "pause" | "busy";
  employment_status: "salaried" | "self_employed";
  languages: string[];
  phone_interpretation_rate: number | null;
  phone_number: string | null;
  birth_country: string | null;
}

export const AdminDashboard = () => {
  const [interpreters, setInterpreters] = useState<Interpreter[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [nameFilter, setNameFilter] = useState("");
  const [sourceLanguageFilter, setSourceLanguageFilter] = useState("all");
  const [targetLanguageFilter, setTargetLanguageFilter] = useState("all");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [birthCountryFilter, setBirthCountryFilter] = useState("all");
  const [employmentStatusFilter, setEmploymentStatusFilter] = useState<string>("all");
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
      birth_country: item.birth_country,
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
    
    const matchesSourceLanguage = sourceLanguageFilter === "all" || 
      interpreter.languages.some(lang => {
        const [source] = lang.split(" → ");
        return source.toLowerCase().includes(sourceLanguageFilter.toLowerCase());
      });

    const matchesTargetLanguage = targetLanguageFilter === "all" || 
      interpreter.languages.some(lang => {
        const [, target] = lang.split(" → ");
        return target && target.toLowerCase().includes(targetLanguageFilter.toLowerCase());
      });

    const matchesPhone = phoneFilter === "" || 
      (interpreter.phone_number && 
       interpreter.phone_number.toLowerCase().includes(phoneFilter.toLowerCase()));

    const matchesBirthCountry = birthCountryFilter === "all" ||
      (interpreter.birth_country === birthCountryFilter);

    const matchesEmploymentStatus = employmentStatusFilter === "all" || 
      interpreter.employment_status === employmentStatusFilter;

    return matchesStatus && 
           matchesName && 
           matchesSourceLanguage && 
           matchesTargetLanguage && 
           matchesPhone && 
           matchesBirthCountry &&
           matchesEmploymentStatus;
  });

  return (
    <div className="container mx-auto py-6">
      <Tabs defaultValue="interpreters" className="space-y-6">
        <TabsList>
          <TabsTrigger value="interpreters">Interprètes</TabsTrigger>
          <TabsTrigger value="missions">Missions</TabsTrigger>
        </TabsList>

        <TabsContent value="interpreters">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <Select value={sourceLanguageFilter} onValueChange={setSourceLanguageFilter}>
                  <SelectTrigger id="source-language">
                    <SelectValue placeholder="Sélectionner une langue source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les langues</SelectItem>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target-language">Langue cible</Label>
                <Select value={targetLanguageFilter} onValueChange={setTargetLanguageFilter}>
                  <SelectTrigger id="target-language">
                    <SelectValue placeholder="Sélectionner une langue cible" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les langues</SelectItem>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

              <CountrySelect
                value={birthCountryFilter}
                onValueChange={setBirthCountryFilter}
                label="Pays de naissance"
                placeholder="Sélectionner un pays"
              />

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
                    <SelectItem value="all">Tous les statuts</SelectItem>
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        </TabsContent>

        <TabsContent value="missions">
          <MissionManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};
