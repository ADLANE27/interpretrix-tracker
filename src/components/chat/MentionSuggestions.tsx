
import React from 'react';
import { Command, CommandGroup, CommandItem, CommandList, CommandInput, CommandEmpty } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Languages, User } from 'lucide-react';
import { LANGUAGES } from '@/lib/constants';
import { MemberSuggestion, LanguageSuggestion, Suggestion } from '@/types/messaging';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { useMessageFormatter } from '@/hooks/chat/useMessageFormatter';

interface MentionSuggestionsProps {
  suggestions: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
  visible: boolean;
  loading?: boolean;
  searchTerm?: string;
}

export const MentionSuggestions = ({ 
  suggestions = [], 
  onSelect, 
  visible,
  loading = false,
  searchTerm = ''
}: MentionSuggestionsProps) => {
  const { normalizeString } = useMessageFormatter();
  
  if (!visible) return null;

  // Convert standardized languages to suggestions format
  const standardLanguageSuggestions: LanguageSuggestion[] = LANGUAGES.map(lang => ({
    name: lang,
    type: 'language'
  }));

  const memberSuggestions = suggestions.filter((s): s is MemberSuggestion => !('type' in s));
  
  // Filter language suggestions based on search term if provided
  const languageSuggestions = searchTerm 
    ? standardLanguageSuggestions.filter(lang => {
        // Use the normalizeString function for consistent comparison
        const normalizedLang = normalizeString(lang.name);
        const normalizedSearch = normalizeString(searchTerm);
        
        return normalizedLang.includes(normalizedSearch);
      })
    : standardLanguageSuggestions;

  if (loading) {
    return (
      <motion.div 
        className="absolute bottom-full mb-1 w-72 z-50 bg-background shadow-lg rounded-lg border border-border"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Command className="rounded-lg">
          <CommandInput 
            placeholder="Rechercher un utilisateur..." 
            className="border-b" 
            disabled 
            value={searchTerm} 
          />
          <CommandList>
            <div className="p-4 text-center text-sm text-muted-foreground">
              Chargement des suggestions...
            </div>
          </CommandList>
        </Command>
      </motion.div>
    );
  }

  if (!Array.isArray(suggestions) || (memberSuggestions.length === 0 && languageSuggestions.length === 0)) {
    return (
      <motion.div 
        className="absolute bottom-full mb-1 w-72 z-50 bg-background shadow-lg rounded-lg border border-border"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Command className="rounded-lg">
          <CommandInput 
            placeholder="Rechercher un utilisateur ou une langue..." 
            className="border-b" 
            value={searchTerm} 
          />
          <CommandList>
            <CommandEmpty>Aucune suggestion trouvée</CommandEmpty>
          </CommandList>
        </Command>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="absolute bottom-full mb-1 w-72 z-50 bg-background shadow-lg rounded-lg border border-border"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Command
        className="rounded-lg"
        filter={(value, search) => {
          // Use the normalizeString function for consistent matching
          const normalizedSearch = normalizeString(search);
          const normalizedValue = normalizeString(value);
          
          // Prioritize matches: exact > starts with > contains > word match
          if (normalizedValue === normalizedSearch) return 1;
          if (normalizedValue.startsWith(normalizedSearch)) return 0.9;
          if (normalizedValue.includes(normalizedSearch)) return 0.75;
          if (normalizedValue.split(/\s+/).some(word => word.startsWith(normalizedSearch))) return 0.5;
          return 0;
        }}
      >
        <CommandInput 
          placeholder="Rechercher un utilisateur ou une langue..." 
          className="border-b" 
          value={searchTerm}
          autoFocus
        />
        <CommandList>
          <ScrollArea className="max-h-[250px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {languageSuggestions.length > 0 && (
              <CommandGroup heading="Langues">
                {languageSuggestions.map((lang) => (
                  <CommandItem
                    key={lang.name}
                    value={lang.name.toLowerCase()}
                    onSelect={() => onSelect(lang)}
                    className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-accent transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full flex items-center justify-center bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300 border border-border">
                      <Languages className="h-4 w-4" />
                    </div>
                    <div className="font-medium">{lang.name}</div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {memberSuggestions.length > 0 && (
              <CommandGroup heading="Membres">
                {memberSuggestions.map((member) => (
                  <CommandItem
                    key={member.id}
                    value={`${member.name.toLowerCase()} ${member.email.toLowerCase()}`}
                    onSelect={() => onSelect(member)}
                    className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-accent transition-colors"
                  >
                    <Avatar className="h-8 w-8 border border-border">
                      {member.avatarUrl ? (
                        <AvatarImage src={member.avatarUrl} alt={member.name} />
                      ) : (
                        <AvatarFallback className={
                          member.role === 'admin' 
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' 
                            : 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300'
                        }>
                          {member.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {member.role === 'admin' ? 'Administrateur' : 'Interprète'}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </ScrollArea>
        </CommandList>
      </Command>
    </motion.div>
  );
};
