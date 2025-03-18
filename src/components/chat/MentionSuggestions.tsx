
import React from 'react';
import { Command, CommandGroup, CommandItem, CommandList, CommandInput, CommandEmpty } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Languages, User } from 'lucide-react';
import { LANGUAGES } from '@/lib/constants';
import { MemberSuggestion, LanguageSuggestion, Suggestion } from '@/types/messaging';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MentionSuggestionsProps {
  suggestions: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
  visible: boolean;
  loading?: boolean;
}

export const MentionSuggestions = ({ 
  suggestions = [], 
  onSelect, 
  visible,
  loading = false
}: MentionSuggestionsProps) => {
  if (!visible) return null;

  // Convert standardized languages to suggestions format
  const standardLanguageSuggestions: LanguageSuggestion[] = LANGUAGES.map(lang => ({
    name: lang,
    type: 'language'
  }));

  const memberSuggestions = suggestions.filter((s): s is MemberSuggestion => !('type' in s));
  const languageSuggestions = standardLanguageSuggestions;

  if (loading) {
    return (
      <div className="absolute bottom-full mb-1 w-64 z-50">
        <Command className="border rounded-lg shadow-md">
          <CommandInput placeholder="Rechercher..." className="border-b" disabled />
          <CommandList>
            <div className="p-4 text-center text-sm text-muted-foreground">
              Chargement des suggestions...
            </div>
          </CommandList>
        </Command>
      </div>
    );
  }

  if (!Array.isArray(suggestions) || (memberSuggestions.length === 0 && languageSuggestions.length === 0)) {
    return (
      <div className="absolute bottom-full mb-1 w-64 z-50">
        <Command className="border rounded-lg shadow-md">
          <CommandInput placeholder="Rechercher..." className="border-b" />
          <CommandList>
            <CommandEmpty>Aucune suggestion trouvée</CommandEmpty>
          </CommandList>
        </Command>
      </div>
    );
  }

  return (
    <div className="absolute bottom-full mb-1 w-64 z-50">
      <Command
        className="border rounded-lg shadow-md"
        filter={(value, search) => {
          // Improved search to handle diacritics and case
          const normalizedSearch = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const normalizedValue = value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          
          // Check if value starts with or contains the search term
          if (normalizedValue.startsWith(normalizedSearch)) return 1;
          if (normalizedValue.includes(normalizedSearch)) return 0.5;
          return 0;
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
                    <Avatar className="h-6 w-6">
                      {member.avatarUrl ? (
                        <AvatarImage src={member.avatarUrl} alt={member.name} />
                      ) : (
                        <AvatarFallback>
                          {member.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-xs text-muted-foreground">{member.role}</div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

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
          </ScrollArea>
        </CommandList>
      </Command>
    </div>
  );
};
