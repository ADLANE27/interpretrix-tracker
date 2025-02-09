
import { format } from "date-fns";
import { fr } from 'date-fns/locale';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, Filter, Trash2, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { LANGUAGES } from "@/lib/constants";

// Sort languages for dropdowns
const sortedLanguages = [...LANGUAGES].sort((a, b) => a.localeCompare(b));

interface Mission {
  id: string;
  source_language: string;
  target_language: string;
  estimated_duration: number;
  status: string;
  created_at: string;
  assigned_interpreter_id?: string;
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  mission_type: 'immediate' | 'scheduled';
  interpreter_profiles?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture_url: string | null;
    status: string;
  };
}

interface MissionListProps {
  missions: Mission[];
  onDelete: (missionId: string) => Promise<void>;
}

export const MissionList = ({ missions, onDelete }: MissionListProps) => {
  const [filters, setFilters] = useState({
    missionType: "all",
    status: "all",
    sourceLanguage: "all",
    targetLanguage: "all",
    startDate: "",
    endDate: "",
    interpreterName: "",
  });

  const calculateDuration = (mission: Mission) => {
    if (mission.mission_type === 'scheduled' && mission.scheduled_start_time && mission.scheduled_end_time) {
      const durationInMinutes = Math.round(
        (new Date(mission.scheduled_end_time).getTime() - new Date(mission.scheduled_start_time).getTime()) / 1000 / 60
      );
      return `${durationInMinutes} minutes`;
    }
    return `${mission.estimated_duration} minutes`;
  };

  const resetFilters = () => {
    setFilters({
      missionType: "all",
      status: "all",
      sourceLanguage: "all",
      targetLanguage: "all",
      startDate: "",
      endDate: "",
      interpreterName: "",
    });
  };

  const filteredMissions = missions.filter(mission => {
    const missionDate = new Date(mission.created_at);
    const startDate = filters.startDate ? new Date(filters.startDate) : null;
    const endDate = filters.endDate ? new Date(filters.endDate) : null;
    
    const matchesMissionType = filters.missionType === "all" || mission.mission_type === filters.missionType;
    const matchesStatus = filters.status === "all" || 
      (filters.status === "awaiting" && mission.status === "awaiting_acceptance") ||
      (filters.status === "accepted" && mission.status === "accepted");
    const matchesSourceLanguage = filters.sourceLanguage === "all" || mission.source_language === filters.sourceLanguage;
    const matchesTargetLanguage = filters.targetLanguage === "all" || mission.target_language === filters.targetLanguage;
    const matchesDate = (!startDate || missionDate >= startDate) && (!endDate || missionDate <= endDate);
    const matchesInterpreter = !filters.interpreterName || 
      (mission.interpreter_profiles && 
        `${mission.interpreter_profiles.first_name} ${mission.interpreter_profiles.last_name}`
          .toLowerCase()
          .includes(filters.interpreterName.toLowerCase()));

    return matchesMissionType && 
           matchesStatus && 
           matchesSourceLanguage && 
           matchesTargetLanguage && 
           matchesDate && 
           matchesInterpreter;
  }).sort((a, b) => {
    // Sort by interpreter name if available, otherwise by date
    if (a.interpreter_profiles && b.interpreter_profiles) {
      const nameA = `${a.interpreter_profiles.first_name} ${a.interpreter_profiles.last_name}`.toLowerCase();
      const nameB = `${b.interpreter_profiles.first_name} ${b.interpreter_profiles.last_name}`.toLowerCase();
      return nameA.localeCompare(nameB);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (missions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucune mission trouvée
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div className="flex gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filtres
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filtres</SheetTitle>
                <SheetDescription>
                  Affinez la liste des missions selon vos critères
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Type de mission</Label>
                  <Select
                    value={filters.missionType}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, missionType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      <SelectItem value="immediate">Immédiate</SelectItem>
                      <SelectItem value="scheduled">Programmée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="awaiting">En attente d'acceptation</SelectItem>
                      <SelectItem value="accepted">Acceptée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Langue source</Label>
                  <Select
                    value={filters.sourceLanguage}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, sourceLanguage: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner la langue source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les langues</SelectItem>
                      {sortedLanguages.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Langue cible</Label>
                  <Select
                    value={filters.targetLanguage}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, targetLanguage: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner la langue cible" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les langues</SelectItem>
                      {sortedLanguages.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date de début</Label>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Date de fin</Label>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nom de l'interprète</Label>
                  <Input
                    type="text"
                    placeholder="Rechercher un interprète..."
                    value={filters.interpreterName}
                    onChange={(e) => setFilters(prev => ({ ...prev, interpreterName: e.target.value }))}
                  />
                </div>

                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={resetFilters}
                >
                  <X className="h-4 w-4 mr-2" />
                  Réinitialiser les filtres
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          
          {(filters.missionType !== "all" || 
            filters.status !== "all" || 
            filters.sourceLanguage !== "all" || 
            filters.targetLanguage !== "all" || 
            filters.startDate || 
            filters.endDate || 
            filters.interpreterName) && (
            <Button 
              variant="ghost" 
              onClick={resetFilters}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Effacer les filtres
            </Button>
          )}
        </div>
        
        <div className="text-sm text-muted-foreground">
          {filteredMissions.length} {filteredMissions.length === 1 ? 'mission trouvée' : 'missions trouvées'}
        </div>
      </div>

      <div className="h-[calc(100vh-16rem)] overflow-y-auto pr-2">
        <div className="space-y-4">
          {filteredMissions.map((mission) => (
            <Card key={mission.id} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    {mission.mission_type === 'scheduled' ? (
                      <Calendar className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-green-500" />
                    )}
                    <Badge variant={mission.mission_type === 'scheduled' ? 'secondary' : 'default'}>
                      {mission.mission_type === 'scheduled' ? 'Programmée' : 'Immédiate'}
                    </Badge>
                    {mission.status === 'awaiting_acceptance' && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        En attente d'acceptation
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-2">
                    {mission.source_language} → {mission.target_language}
                  </p>
                  
                  {mission.mission_type === 'scheduled' && mission.scheduled_start_time && mission.scheduled_end_time && (
                    <p className="text-sm text-gray-600">
                      Le {format(new Date(mission.scheduled_start_time), "dd/MM/yyyy", { locale: fr })} {" "}
                      de {format(new Date(mission.scheduled_start_time), "HH:mm")} {" "}
                      à {format(new Date(mission.scheduled_end_time), "HH:mm")} {" "}
                      <span className="ml-1">({calculateDuration(mission)})</span>
                    </p>
                  )}
                  
                  {mission.mission_type === 'immediate' && (
                    <p className="text-sm text-gray-600">
                      Durée: {calculateDuration(mission)}
                    </p>
                  )}

                  {mission.interpreter_profiles && (
                    <div className="mt-2 flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={mission.interpreter_profiles.profile_picture_url || undefined} />
                        <AvatarFallback>
                          {mission.interpreter_profiles.first_name[0]}
                          {mission.interpreter_profiles.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-600">
                        Mission acceptée par {mission.interpreter_profiles.first_name} {mission.interpreter_profiles.last_name}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  <p className="text-sm text-gray-600">
                    {format(new Date(mission.created_at), "d MMMM yyyy", { locale: fr })}
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer la mission</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir supprimer cette mission ? Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => onDelete(mission.id)}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
