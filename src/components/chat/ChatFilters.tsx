
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';

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
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filtres</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="text-muted-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Effacer les filtres
        </Button>
      </div>
      
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="user">Utilisateur</Label>
          <select
            id="user"
            value={selectedUserId}
            onChange={handleUserChange}
            className="w-full p-2 border rounded-md"
          >
            <option value="">Tous les utilisateurs</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="keyword">Mot-clé</Label>
          <Input
            id="keyword"
            value={keyword}
            onChange={handleKeywordChange}
            placeholder="Rechercher dans les messages..."
          />
        </div>

        <div className="space-y-2">
          <Label>Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full justify-start text-left font-normal ${!date && "text-muted-foreground"}`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "dd/MM/yyyy") : "Sélectionner une date"}
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
        </div>
      </div>
    </div>
  );
};
