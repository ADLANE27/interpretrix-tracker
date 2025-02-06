
import React from 'react';
import { Command, CommandGroup, CommandItem, CommandList, CommandInput } from '@/components/ui/command';
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
  suggestions = [], 
  onSelect, 
  visible 
}: MentionSuggestionsProps) => {
  if (!visible || !Array.isArray(suggestions) || suggestions.length === 0) return null;

  return (
    <div className="absolute bottom-full mb-1 w-64 z-50">
      <Command
        className="border rounded-lg shadow-md"
        filter={(value, search) => {
          if (value.includes(search.toLowerCase())) return 1
          return 0
        }}
      >
        <CommandInput placeholder="Search members..." className="border-b" />
        <CommandList>
          <ScrollArea className="max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            <CommandGroup heading="Membres">
              {suggestions.map((member) => (
                <CommandItem
                  key={member.id}
                  value={`${member.name.toLowerCase()} ${member.email.toLowerCase()}`}
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
        </CommandList>
      </Command>
    </div>
  );
};
