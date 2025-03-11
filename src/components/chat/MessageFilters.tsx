
import React from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MessageFiltersProps {
  filters: {
    userId?: string;
    keyword?: string;
    date?: Date;
  };
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
  currentUserId: string | null;
  channelId: string;
}

export const MessageFilters = ({
  filters,
  onFiltersChange,
  onClearFilters,
  currentUserId,
  channelId
}: MessageFiltersProps) => {
  const { data: channelMembers } = useQuery({
    queryKey: ['channelMembers', channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channel_members')
        .select(`
          user_id,
          users:user_id (
            id,
            first_name,
            last_name
          )
        `)
        .eq('channel_id', channelId);

      if (error) throw error;
      return data.map(member => ({
        id: member.user_id,
        name: `${member.users.first_name} ${member.users.last_name}`
      }));
    },
    enabled: !!channelId
  });

  return (
    <div className="flex items-center gap-2 p-2 border-b">
      <Input
        placeholder="Rechercher un message..."
        value={filters.keyword || ''}
        onChange={(e) => onFiltersChange({ ...filters, keyword: e.target.value })}
        className="max-w-[200px]"
      />

      <Select
        value={filters.userId || "all"}
        onValueChange={(value) => onFiltersChange({ ...filters, userId: value === "all" ? undefined : value })}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Filtrer par utilisateur" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les messages</SelectItem>
          {currentUserId && <SelectItem value="current">Mes messages</SelectItem>}
          {channelMembers?.filter(member => member.id !== currentUserId).map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
