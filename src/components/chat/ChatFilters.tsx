
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Filter, X } from 'lucide-react';

interface ChatFiltersProps {
  onFiltersChange: (filters: {
    userId?: string;
    keyword?: string;
    date?: Date;
  }) => void;
  users: Array<{
    id: string;
    name: string;
  }>;
  onClearFilters: () => void;
}

export const ChatFilters = ({ onFiltersChange, users, onClearFilters }: ChatFiltersProps) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [date, setDate] = useState<Date>();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = e.target.value;
    setSelectedUserId(userId);
    onFiltersChange({ userId: userId || undefined, keyword, date });
  };

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
    onFiltersChange({ userId: selectedUserId || undefined, keyword: e.target.value, date });
  };

  const handleDateChange = (newDate: Date | undefined) => {
    setDate(newDate);
    onFiltersChange({ userId: selectedUserId || undefined, keyword, date: newDate });
  };

  const handleClearFilters = () => {
    setSelectedUserId('');
    setKeyword('');
    setDate(undefined);
    onClearFilters();
  };

  return (
    <div className="border-b border-gray-100 p-4 bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-muted-foreground self-start hover:bg-gray-100/80 transition-colors duration-200"
        >
          <Filter className="h-4 w-4 mr-1.5" />
          Filtres
        </Button>

        {isExpanded && (
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center animate-fade-in">
            <select
              value={selectedUserId}
              onChange={handleUserChange}
              className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
            >
              <option value="">Tous les utilisateurs</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>

            <Input
              value={keyword}
              onChange={handleKeywordChange}
              placeholder="Rechercher un message..."
              className="h-9 rounded-lg border-gray-300 bg-white shadow-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-300"
            />

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`w-full sm:w-[200px] h-9 justify-start text-left rounded-lg border-gray-300 bg-white shadow-sm hover:bg-gray-50 transition-all duration-300 ${!date && "text-muted-foreground"}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                    {date ? format(date, "dd/MM/yyyy") : "Sélectionner une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateChange}
                    initialFocus
                    className="rounded-lg border-0 shadow-lg"
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-muted-foreground h-9 hover:bg-gray-100/80 transition-colors duration-200"
              >
                <X className="h-4 w-4 mr-1.5" />
                Effacer
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
