
import React from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search, UserSearch, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface MessageFiltersProps {
  filters: {
    userId?: string;
    keyword?: string;
    date?: Date;
  };
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
  currentUserId: string | null;
}

export const MessageFilters = ({
  filters,
  onFiltersChange,
  onClearFilters,
  currentUserId
}: MessageFiltersProps) => {
  return (
    <div className="flex items-center gap-2 p-2 border-b">
      <Input
        placeholder="Rechercher un message..."
        value={filters.keyword || ''}
        onChange={(e) => onFiltersChange({ ...filters, keyword: e.target.value })}
        className="max-w-[200px]"
      />

      <Button
        variant="outline"
        size="sm"
        className={filters.userId ? "bg-purple-50 border-purple-200" : ""}
        onClick={() => {
          if (filters.userId) {
            onFiltersChange({ ...filters, userId: undefined });
          } else {
            onFiltersChange({ ...filters, userId: 'current' });
          }
        }}
      >
        <UserSearch className="h-4 w-4 mr-2" />
        {filters.userId ? "Mes messages" : "Tous les messages"}
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={filters.date ? "bg-purple-50 border-purple-200" : ""}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            {filters.date ? format(filters.date, 'PP', { locale: fr }) : "Choisir une date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.date}
            onSelect={(date) => onFiltersChange({ ...filters, date })}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {(filters.keyword || filters.userId || filters.date) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-gray-500"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
