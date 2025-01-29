import { useState } from "react";
import { InterpreterCard } from "./InterpreterCard";
import { StatusFilter } from "./StatusFilter";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

// Données de test (à remplacer par des données réelles plus tard)
const mockInterpreters = [
  {
    id: "1",
    name: "Marie Dubois",
    status: "available",
    type: "internal",
    languages: ["Français", "Anglais", "Espagnol"],
  },
  {
    id: "2",
    name: "John Smith",
    status: "busy",
    type: "external",
    languages: ["Anglais", "Allemand"],
    hourlyRate: 45,
  },
  {
    id: "3",
    name: "Ana García",
    status: "pause",
    type: "internal",
    languages: ["Espagnol", "Français", "Portugais"],
  },
] as const;

export const InterpreterDashboard = () => {
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

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

  return (
    <div className="container mx-auto py-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {filteredInterpreters.map((interpreter) => (
          <InterpreterCard
            key={interpreter.id}
            interpreter={interpreter}
          />
        ))}
      </div>
    </div>
  );
};