
import React from 'react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search, User, X, Filter } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Command, CommandInput, CommandList, CommandGroup, CommandItem } from "@/components/ui/command";

interface ChatMember {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface SearchFilterProps {
  filters: {
    userId?: string;
    keyword?: string;
    date?: Date;
  };
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
  chatMembers?: ChatMember[];
}

export const SearchFilter: React.FC<SearchFilterProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  chatMembers = []
}) => {
  const [showFilters, setShowFilters] = React.useState(false);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-2 py-1 bg-white border rounded-lg max-w-[200px]">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Rechercher..."
          className="border-none outline-none bg-transparent text-sm w-full"
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
            variant="outline"
            size="sm"
            className={`${Object.values(filters).some(v => v) ? 'bg-purple-100 text-purple-900 hover:bg-purple-200' : ''}`}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Filtrer par date</h4>
              <Calendar
                mode="single"
                selected={filters.date}
                onSelect={(date) => onFiltersChange({ ...filters, date })}
                initialFocus
                locale={fr}
              />
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Filtrer par utilisateur</h4>
              <Command className="border rounded-md">
                <CommandInput placeholder="Rechercher un utilisateur..." />
                <CommandList>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => onFiltersChange({ ...filters, userId: undefined })}
                      className="cursor-pointer"
                    >
                      Tous les utilisateurs
                    </CommandItem>
                    {chatMembers.map((member) => (
                      <CommandItem
                        key={member.id}
                        onSelect={() => onFiltersChange({ ...filters, userId: member.id })}
                        className="cursor-pointer"
                      >
                        <User className="mr-2 h-4 w-4" />
                        {member.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          </div>

          {(filters.date || filters.userId) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="mt-4 w-full text-gray-500 hover:text-gray-700"
            >
              Effacer les filtres
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};
