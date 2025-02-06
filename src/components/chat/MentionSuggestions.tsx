import React from 'react';
import { Command, CommandGroup, CommandItem } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MemberSuggestion {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'interpreter';
}

interface MentionSuggestionsProps {
  suggestions: MemberSuggestion[];
  onSelect: (member: MemberSuggestion) => void;
  visible: boolean;
}

export const MentionSuggestions = ({ 
  suggestions = [], // Provide default empty array
  onSelect, 
  visible 
}: MentionSuggestionsProps) => {
  if (!visible || !suggestions?.length) return null;

  return (
    <div className="absolute bottom-full mb-1 w-64 z-50">
      <Command className="border rounded-lg shadow-md">
        <ScrollArea className="max-h-[200px]">
          <CommandGroup heading="Membres">
            {suggestions.map((member) => (
              <CommandItem
                key={member.id}
                onSelect={() => onSelect(member)}
                className="flex items-center gap-2 p-2 cursor-pointer hover:bg-accent"
              >
                <div>
                  <div className="font-medium">{member.name}</div>
                  <div className="text-sm text-muted-foreground">{member.email}</div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </ScrollArea>
      </Command>
    </div>
  );
};