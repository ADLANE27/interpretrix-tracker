
import React from 'react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search, User, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SearchFilterProps {
  filters: {
    userId?: string;
    keyword?: string;
    date?: Date;
  };
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
}

export const SearchFilter: React.FC<SearchFilterProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
}) => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-2 py-1 bg-white border rounded-lg">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher dans les messages..."
          className="border-none outline-none bg-transparent text-sm w-48"
          value={filters.keyword || ''}
          onChange={(e) => onFiltersChange({ ...filters, keyword: e.target.value })}
        />
        {filters.keyword && (
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0"
            onClick={() => onFiltersChange({ ...filters, keyword: '' })}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={filters.date ? "default" : "outline"}
            className={`${filters.date ? 'bg-purple-100 text-purple-900 hover:bg-purple-200' : ''}`}
            size="sm"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.date ? (
              format(filters.date, 'd MMM', { locale: fr })
            ) : (
              "Filtrer par date"
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.date}
            onSelect={(date) => onFiltersChange({ ...filters, date })}
            initialFocus
            locale={fr}
          />
        </PopoverContent>
      </Popover>

      <Button
        variant={filters.userId ? "default" : "outline"}
        size="sm"
        className={`${filters.userId ? 'bg-purple-100 text-purple-900 hover:bg-purple-200' : ''}`}
        onClick={() => {
          if (filters.userId) {
            onFiltersChange({ ...filters, userId: undefined });
          } else {
            // Set to current user's ID to filter their messages
            onFiltersChange({ ...filters, userId: 'current' });
          }
        }}
      >
        <User className="mr-2 h-4 w-4" />
        {filters.userId ? "Mes messages" : "Messages de tous"}
      </Button>

      {(filters.keyword || filters.date || filters.userId) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-gray-500 hover:text-gray-700"
        >
          Effacer les filtres
        </Button>
      )}
    </div>
  );
};
