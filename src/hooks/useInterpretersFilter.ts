
import { useState } from "react";
import { Interpreter } from "./useInterpretersData";
import { EmploymentStatus } from "@/utils/employmentStatus";

export const useInterpretersFilter = (interpreters: Interpreter[]) => {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [birthCountryFilter, setBirthCountryFilter] = useState("all");
  const [employmentStatusFilters, setEmploymentStatusFilters] = useState<EmploymentStatus[]>([]);
  const [rateSort, setRateSort] = useState<string>("none");
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredInterpreters = interpreters.filter(interpreter => {
    const matchesStatus = !selectedStatus || interpreter.status === selectedStatus;
    const matchesName = nameFilter === "" || `${interpreter.first_name} ${interpreter.last_name}`.toLowerCase().includes(nameFilter.toLowerCase());
    const matchesLanguage = languageFilter === "all" || interpreter.languages.some(lang => {
      const [source, target] = lang.split('→').map(l => l.trim());
      return source.toLowerCase().includes(languageFilter.toLowerCase()) || target?.toLowerCase().includes(languageFilter.toLowerCase());
    });
    const matchesPhone = phoneFilter === "" || interpreter.phone_number && interpreter.phone_number.toLowerCase().includes(phoneFilter.toLowerCase());
    const matchesBirthCountry = birthCountryFilter === "all" || interpreter.birth_country === birthCountryFilter;
    const matchesEmploymentStatus = employmentStatusFilters.length === 0 || employmentStatusFilters.includes(interpreter.employment_status);
    return matchesStatus && matchesName && matchesLanguage && matchesPhone && matchesBirthCountry && matchesEmploymentStatus;
  }).sort((a, b) => {
    if (rateSort === "rate-asc") {
      return (a.tarif_15min || 0) - (b.tarif_15min || 0);
    }
    return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
  });

  const statusCounts = {
    available: interpreters.filter(i => i.status === "available").length,
    busy: interpreters.filter(i => i.status === "busy").length,
    pause: interpreters.filter(i => i.status === "pause").length,
    unavailable: interpreters.filter(i => i.status === "unavailable").length,
    total: interpreters.length
  };

  return {
    filteredInterpreters,
    statusCounts,
    filterState: {
      selectedStatus,
      setSelectedStatus,
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
      isFiltersOpen,
      setIsFiltersOpen,
      viewMode,
      setViewMode
    }
  };
};
