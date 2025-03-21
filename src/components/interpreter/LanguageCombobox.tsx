
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface LanguageComboboxProps {
  languages: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  allLanguagesOption?: boolean;
  allLanguagesLabel?: string;
}

export function LanguageCombobox({
  languages,
  value,
  onChange,
  placeholder = "Sélectionner une langue...",
  className,
  allLanguagesOption = true,
  allLanguagesLabel = "Toutes les langues",
}: LanguageComboboxProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Sort languages alphabetically
  const sortedLanguages = React.useMemo(() => {
    return [...languages].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [languages]);

  // Common languages to highlight at the top of the list
  const commonLanguages = [
    "Français", "Anglais", "Espagnol", "Arabe", "Arabe Maghrébin", "Dari", "Pashto", "Farsi", 
    "Russe", "Chinois", "Allemand", "Italien", "Portugais"
  ];
  
  // Filter common languages that exist in our language list
  const availableCommonLanguages = commonLanguages.filter(lang => 
    languages.includes(lang)
  );

  // Filter languages based on search query
  const filteredLanguages = searchQuery 
    ? sortedLanguages.filter(lang => 
        lang.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sortedLanguages;

  // Filter common languages based on search query
  const filteredCommonLanguages = searchQuery
    ? availableCommonLanguages.filter(lang => 
        lang.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableCommonLanguages;

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="z-[200]">
        <div className="p-2 border-b sticky top-0 bg-white z-10">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une langue..." 
              className="pl-8 pr-8 h-9"
            />
            {searchQuery && (
              <button 
                onClick={handleClearSearch}
                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <ScrollArea className="h-72">
          {allLanguagesOption && !searchQuery && (
            <SelectItem value="all">{allLanguagesLabel}</SelectItem>
          )}
          
          {/* Show all languages option if searching and it matches the search */}
          {allLanguagesOption && searchQuery && 
           allLanguagesLabel.toLowerCase().includes(searchQuery.toLowerCase()) && (
            <SelectItem value="all">{allLanguagesLabel}</SelectItem>
          )}
          
          {/* Common languages section */}
          {filteredCommonLanguages.length > 0 && !searchQuery && (
            <>
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Langues courantes
              </div>
              {filteredCommonLanguages.map((language) => (
                <SelectItem key={`common-${language}`} value={language}>
                  {language}
                </SelectItem>
              ))}
              
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Toutes les langues
              </div>
            </>
          )}
          
          {/* When searching, show common languages that match without headers */}
          {filteredCommonLanguages.length > 0 && searchQuery && (
            filteredCommonLanguages.map((language) => (
              <SelectItem key={`common-${language}`} value={language}>
                {language}
              </SelectItem>
            ))
          )}
          
          {/* All languages */}
          {filteredLanguages.map((language) => (
            // Skip languages that are already in the common languages section
            (!availableCommonLanguages.includes(language) || searchQuery) && (
              <SelectItem key={language} value={language}>
                {language}
              </SelectItem>
            )
          ))}

          {/* Show message when no languages match the search */}
          {filteredLanguages.length === 0 && (
            <div className="px-2 py-4 text-sm text-center text-muted-foreground">
              Aucune langue trouvée
            </div>
          )}
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}
