
import React from 'react';
import { Command, CommandGroup, CommandItem, CommandList, CommandInput } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Languages } from 'lucide-react';

interface MemberSuggestion {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'interpreter';
}

interface LanguageSuggestion {
  name: string;
  type: 'language';
}

type Suggestion = MemberSuggestion | LanguageSuggestion;

interface MentionSuggestionsProps {
  suggestions: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
  visible: boolean;
}

export const MentionSuggestions = ({ 
  suggestions = [], 
  onSelect, 
  visible 
}: MentionSuggestionsProps) => {
  if (!visible || !Array.isArray(suggestions) || suggestions.length === 0) return null;

  const memberSuggestions = suggestions.filter((s): s is MemberSuggestion => !('type' in s));
  const languageSuggestions = suggestions.filter((s): s is LanguageSuggestion => 'type' in s && s.type === 'language');

  return (
    <div className="absolute bottom-full mb-1 w-64 z-50">
      <Command
        className="border rounded-lg shadow-md"
        filter={(value, search) => {
          if (value.toLowerCase().includes(search.toLowerCase())) return 1
          return 0
        }}
      >
        <CommandInput placeholder="Rechercher..." className="border-b" />
        <CommandList>
          <ScrollArea className="max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {memberSuggestions.length > 0 && (
              <CommandGroup heading="Membres">
                {memberSuggestions.map((member) => (
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
            )}

            {languageSuggestions.length > 0 && (
              <CommandGroup heading="Langues">
                {languageSuggestions.map((lang) => (
                  <CommandItem
                    key={lang.name}
                    value={lang.name.toLowerCase()}
                    onSelect={() => onSelect(lang)}
                    className="flex items-center gap-2 p-2 cursor-pointer hover:bg-accent"
                  >
                    <Languages className="h-4 w-4" />
                    <div className="font-medium">{lang.name}</div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </ScrollArea>
        </CommandList>
      </Command>
    </div>
  );
};
