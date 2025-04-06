
import React from "react";
import { useInterpretersData } from "@/hooks/useInterpretersData";
import { useInterpretersFilter } from "@/hooks/useInterpretersFilter";
import { StatisticsCards } from "@/components/admin/dashboard/StatisticsCards";
import { InterpreterFilterBar } from "./InterpreterFilterBar";
import { AdvancedFilters } from "./AdvancedFilters";
import { InterpretersList } from "./InterpretersList";

export const InterpretersTab: React.FC = () => {
  const { 
    interpreters, 
    isConnected, 
    todayMissionsCount, 
    handleInterpreterStatusChange 
  } = useInterpretersData();
  
  const { 
    filteredInterpreters, 
    statusCounts, 
    filterState 
  } = useInterpretersFilter(interpreters);

  return (
    <div className="min-h-full p-4 sm:p-6 space-y-6 bg-slate-50">
      <StatisticsCards 
        totalInterpreters={statusCounts.total} 
        availableCount={statusCounts.available} 
        busyCount={statusCounts.busy} 
        pauseCount={statusCounts.pause} 
        unavailableCount={statusCounts.unavailable} 
        todayMissionsCount={todayMissionsCount} 
      />
      
      <InterpreterFilterBar
        selectedStatus={filterState.selectedStatus}
        onStatusChange={filterState.setSelectedStatus}
        viewMode={filterState.viewMode}
        setViewMode={filterState.setViewMode}
      />

      <AdvancedFilters
        isFiltersOpen={filterState.isFiltersOpen}
        setIsFiltersOpen={filterState.setIsFiltersOpen}
        nameFilter={filterState.nameFilter}
        setNameFilter={filterState.setNameFilter}
        languageFilter={filterState.languageFilter}
        setLanguageFilter={filterState.setLanguageFilter}
        phoneFilter={filterState.phoneFilter}
        setPhoneFilter={filterState.setPhoneFilter}
        birthCountryFilter={filterState.birthCountryFilter}
        setBirthCountryFilter={filterState.setBirthCountryFilter}
        employmentStatusFilters={filterState.employmentStatusFilters}
        setEmploymentStatusFilters={filterState.setEmploymentStatusFilters}
        rateSort={filterState.rateSort}
        setRateSort={filterState.setRateSort}
      />

      {!isConnected && (
        <div className="bg-amber-100 border border-amber-400 text-amber-700 px-4 py-2 rounded-md shadow-sm mb-4 animate-pulse">
          Reconnexion en cours...
        </div>
      )}

      <InterpretersList
        interpreters={filteredInterpreters}
        onStatusChange={handleInterpreterStatusChange}
        viewMode={filterState.viewMode}
        key={`interpreters-list-${interpreters.map(i => `${i.id}-${i.status}`).join('-')}`}
      />
    </div>
  );
};
