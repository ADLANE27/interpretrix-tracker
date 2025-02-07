
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    <div className="border-b p-2 bg-white">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-muted-foreground"
        >
          <Filter className="h-4 w-4 mr-1" />
          Filtres
        </Button>

        {isExpanded && (
          <div className="flex-1 flex items-center space-x-3">
            <div className="flex-none w-[160px]">
              <select
                value={selectedUserId}
                onChange={handleUserChange}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">Tous les utilisateurs</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-none w-[160px]">
              <Input
                value={keyword}
                onChange={handleKeywordChange}
                placeholder="Rechercher..."
                className="h-9 px-2"
              />
            </div>

            <div className="flex items-center space-x-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`w-[160px] h-9 justify-start text-left truncate ${!date && "text-muted-foreground"}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {date ? format(date, "dd/MM/yyyy") : "Sélectionner une date"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-muted-foreground h-9 px-3"
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

