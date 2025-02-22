
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
    );
  }, [userSearchQuery, chatMembers]);

  const handleUserSelect = (userId: string) => {
    onFiltersChange({ ...filters, userId });
    setUserSearchQuery('');
    setShowUserResults(false);
  };

  const clearUserFilter = () => {
    onFiltersChange({ ...filters, userId });
    setUserSearchQuery('');
  };

  const getSelectedUserName = () => {
    if (!filters.userId) return '';
    const selectedUser = chatMembers.find(member => member.id === filters.userId);
    return selectedUser ? selectedUser.name : '';
  };

  return (
    <div className="flex items-center gap-2">
      {/* User search with dropdown */}
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
              setShowUserResults(true);
            }}
            onFocus={() => setShowUserResults(true)}
          />
          {(userSearchQuery || filters.userId) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0"
              onClick={clearUserFilter}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* User search results dropdown */}
        {showUserResults && filteredUsers.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-white border rounded-md shadow-lg">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                onClick={() => handleUserSelect(user.id)}
              >
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm">{user.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message keyword search */}
      <div className="flex items-center gap-2 px-2 py-1 bg-white border rounded-lg max-w-[200px]">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Rechercher un message..."
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

      {/* Date filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={filters.date ? 'bg-purple-100 text-purple-900 hover:bg-purple-200' : ''}
          >
            <CalendarIcon className="h-4 w-4" />
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

      {/* Clear all filters */}
      {(filters.date || filters.userId || filters.keyword) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
