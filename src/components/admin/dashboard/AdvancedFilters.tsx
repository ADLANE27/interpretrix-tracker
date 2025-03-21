
import React from "react";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Filter, X, ChevronUp, ChevronDown, Search, ChevronDown as ChevronDownIcon } from "lucide-react";
import { LanguageCombobox } from "@/components/interpreter/LanguageCombobox";
import { CountrySelect } from "@/components/CountrySelect";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { EmploymentStatus, employmentStatusLabels } from "@/utils/employmentStatus";
import { LANGUAGES } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface AdvancedFiltersProps {
  isFiltersOpen: boolean;
  setIsFiltersOpen: (open: boolean) => void;
  nameFilter: string;
  setNameFilter: (filter: string) => void;
  languageFilter: string;
  setLanguageFilter: (filter: string) => void;
  phoneFilter: string;
  setPhoneFilter: (filter: string) => void;
  birthCountryFilter: string;
  setBirthCountryFilter: (filter: string) => void;
  employmentStatusFilters: EmploymentStatus[];
  setEmploymentStatusFilters: (filters: EmploymentStatus[]) => void;
  rateSort: string;
  setRateSort: (sort: string) => void;
}

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  isFiltersOpen,
  setIsFiltersOpen,
  nameFilter,
  setNameFilter,
  languageFilter,
  setLanguageFilter,
  phoneFilter,
  setPhoneFilter,
  birthCountryFilter,
  setBirthCountryFilter,
  employmentStatusFilters,
  setEmploymentStatusFilters,
  rateSort,
  setRateSort,
}) => {
  const { toast } = useToast();

  const resetAllFilters = () => {
    setNameFilter("");
    setLanguageFilter("all");
    setPhoneFilter("");
    setBirthCountryFilter("all");
    setEmploymentStatusFilters([]);
    setRateSort("none");
    toast({
      title: "Filtres réinitialisés",
      description: "Tous les filtres ont été réinitialisés"
    });
  };

  const toggleEmploymentStatusFilter = (status: EmploymentStatus) => {
    if (employmentStatusFilters.includes(status)) {
      setEmploymentStatusFilters(employmentStatusFilters.filter(s => s !== status));
    } else {
      setEmploymentStatusFilters([...employmentStatusFilters, status]);
    }
  };

  return (
    <Card className="p-6">
      <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Filtres avancés
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={resetAllFilters} className="gap-2">
              <X className="h-4 w-4" />
              Supprimer tous les filtres
            </Button>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-9 p-0">
                {isFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name-search">Nom</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="name-search" placeholder="Rechercher par nom..." className="pl-9" value={nameFilter} onChange={e => setNameFilter(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Langue</Label>
              <LanguageCombobox 
                languages={LANGUAGES}
                value={languageFilter}
                onChange={setLanguageFilter}
                placeholder="Rechercher une langue..."
                emptyMessage="Aucune langue trouvée."
                allLanguagesLabel="Toutes les langues"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone-search">Numéro de téléphone</Label>
              <Input id="phone-search" placeholder="Rechercher par téléphone..." value={phoneFilter} onChange={e => setPhoneFilter(e.target.value)} />
            </div>

            <CountrySelect value={birthCountryFilter} onValueChange={setBirthCountryFilter} label="Pays de naissance" placeholder="Sélectionner un pays" />

            <div className="space-y-2">
              <Label htmlFor="employment-status">Statut professionnel</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between h-10">
                    {employmentStatusFilters.length === 0 ? "Tous les statuts" : employmentStatusFilters.length === 1 ? employmentStatusLabels[employmentStatusFilters[0]] : `${employmentStatusFilters.length} statuts sélectionnés`}
                    <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <div className="p-2">
                    <div className="flex items-center space-x-2 pb-2">
                      <Checkbox id="select-all-statuses" checked={employmentStatusFilters.length === Object.keys(employmentStatusLabels).length} onCheckedChange={checked => {
                      if (checked) {
                        setEmploymentStatusFilters(Object.keys(employmentStatusLabels) as EmploymentStatus[]);
                      } else {
                        setEmploymentStatusFilters([]);
                      }
                    }} />
                      <label htmlFor="select-all-statuses" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Tout sélectionner
                      </label>
                    </div>
                    
                    <div className="border-t my-2"></div>
                    
                    {Object.entries(employmentStatusLabels).map(([value, label]) => <div key={value} className="flex items-center space-x-2 py-1">
                        <Checkbox id={`status-${value}`} checked={employmentStatusFilters.includes(value as EmploymentStatus)} onCheckedChange={() => toggleEmploymentStatusFilter(value as EmploymentStatus)} />
                        <label htmlFor={`status-${value}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          {label}
                        </label>
                      </div>)}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate-sort">Trier par tarif</Label>
              <Select value={rateSort} onValueChange={setRateSort}>
                <SelectTrigger id="rate-sort">
                  <SelectValue placeholder="Trier par tarif" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Pas de tri</SelectItem>
                  <SelectItem value="rate-asc">Du moins cher au plus cher</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
