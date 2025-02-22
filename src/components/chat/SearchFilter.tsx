
import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search, User, X, Filter } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [showUserResults, setShowUserResults] = useState(false);

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery) return [];
    const query = userSearchQuery.toLowerCase();
    return chatMembers.filter(member => 
      member.name.toLowerCase().includes(query)
    ).slice(0, 5); // Limit to first 5 matches
  }, [userSearchQuery, chatMembers]);

  const handleUserSelect = (user: ChatMember) => {
    onFiltersChange({ ...filters, userId: user.id });
    setUserSearchQuery(user.name);
    setShowUserResults(false);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className="flex items-center gap-2 px-2 py-1 bg-white border rounded-lg min-w-[200px]">
          <User className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            className="border-none outline-none bg-transparent text-sm w-full"
            value={userSearchQuery}
            onChange={(e) => {
              setUserSearchQuery(e.target.value);
              if (!e.target.value) {
                onFiltersChange({ ...filters, userId: undefined });
              }
              setShowUserResults(true);
            }}
            onFocus={() => setShowUserResults(true)}
          />
          {userSearchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0"
              onClick={() => {
                setUserSearchQuery('');
                onFiltersChange({ ...filters, userId: undefined });
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Dropdown for user search results */}
        {showUserResults && filteredUsers.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-white border rounded-md shadow-lg max-h-[200px] overflow-y-auto">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                onClick={() => handleUserSelect(user)}
              >
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm">{user.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

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
          </div>

          {filters.date && (
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
