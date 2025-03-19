
import { useState } from "react";
import { PrivateReservationForm } from "./PrivateReservationForm";
import { PrivateReservationList } from "./PrivateReservationList";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Search, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAllLanguages } from "@/hooks/useAllLanguages";

export const ReservationsTab = () => {
  const [nameFilter, setNameFilter] = useState("");
  const [sourceLanguageFilter, setSourceLanguageFilter] = useState("all");
  const [targetLanguageFilter, setTargetLanguageFilter] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const { languages, isLoading: languagesLoading } = useAllLanguages();

  const resetFilters = () => {
    setNameFilter("");
    setSourceLanguageFilter("all");
    setTargetLanguageFilter("all");
    setStartDateFilter("");
    setEndDateFilter("");
  };

  return (
    <div className="space-y-6">
      <PrivateReservationForm />
      
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Filtres</h3>
            <Button variant="outline" onClick={resetFilters} className="gap-2">
              <X className="h-4 w-4" />
              Réinitialiser les filtres
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interpreter-search">Nom de l'interprète</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="interpreter-search"
                  placeholder="Rechercher un interprète..."
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Langue source</Label>
              <Select value={sourceLanguageFilter} onValueChange={setSourceLanguageFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les langues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les langues</SelectItem>
                  {languagesLoading ? (
                    <SelectItem value="loading" disabled>Chargement...</SelectItem>
                  ) : (
                    languages.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Langue cible</Label>
              <Select value={targetLanguageFilter} onValueChange={setTargetLanguageFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les langues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les langues</SelectItem>
                  {languagesLoading ? (
                    <SelectItem value="loading" disabled>Chargement...</SelectItem>
                  ) : (
                    languages.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date">Date de début</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  id="start-date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">Date de fin</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  id="end-date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <PrivateReservationList 
        nameFilter={nameFilter}
        sourceLanguageFilter={sourceLanguageFilter}
        targetLanguageFilter={targetLanguageFilter}
        startDateFilter={startDateFilter}
        endDateFilter={endDateFilter}
      />
    </div>
  );
};
