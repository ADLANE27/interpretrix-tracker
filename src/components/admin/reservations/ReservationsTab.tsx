
import { useState } from "react";
import { PrivateReservationForm } from "./PrivateReservationForm";
import { PrivateReservationList } from "./PrivateReservationList";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { COMPANY_TYPES, LANGUAGES } from "@/lib/constants";
import { Search, Calendar, Building, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageFilter } from "@/components/interpreter/LanguageFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const ReservationsTab = () => {
  const [nameFilter, setNameFilter] = useState("");
  const [sourceLanguageFilter, setSourceLanguageFilter] = useState("all");
  const [targetLanguageFilter, setTargetLanguageFilter] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");

  const resetFilters = () => {
    setNameFilter("");
    setSourceLanguageFilter("all");
    setTargetLanguageFilter("all");
    setStartDateFilter("");
    setEndDateFilter("");
    setCompanyFilter("all");
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
              <LanguageFilter
                languages={LANGUAGES}
                value={sourceLanguageFilter}
                onChange={setSourceLanguageFilter}
                placeholder="Sélectionner une langue source"
                emptyMessage="Aucune langue trouvée"
                allLanguagesLabel="Toutes les langues"
              />
            </div>

            <div className="space-y-2">
              <Label>Langue cible</Label>
              <LanguageFilter
                languages={LANGUAGES}
                value={targetLanguageFilter}
                onChange={setTargetLanguageFilter}
                placeholder="Sélectionner une langue cible" 
                emptyMessage="Aucune langue trouvée"
                allLanguagesLabel="Toutes les langues"
              />
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

            <div className="space-y-2">
              <Label>Entreprise</Label>
              <Select
                value={companyFilter}
                onValueChange={setCompanyFilter}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filtrer par entreprise" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les entreprises</SelectItem>
                  <SelectItem value={COMPANY_TYPES.AFTRAD}>AFTrad</SelectItem>
                  <SelectItem value={COMPANY_TYPES.AFTCOM}>AFTcom</SelectItem>
                </SelectContent>
              </Select>
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
        companyFilter={companyFilter}
      />
    </div>
  );
};
