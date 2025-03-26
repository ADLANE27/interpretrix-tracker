
import React, { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface LanguageFilterProps {
  languages: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  allLanguagesOption?: boolean;
  allLanguagesLabel?: string;
}

export function LanguageFilter({
  languages,
  value,
  onChange,
  placeholder = "Sélectionner une langue...",
  emptyMessage = "Aucune langue trouvée.",
  className,
  allLanguagesOption = true,
  allLanguagesLabel = "Toutes les langues",
}: LanguageFilterProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Normalize a string for comparison (remove accents, lowercase)
  const normalizeString = (str: string): string => {
    return str.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  };

  // Filter and sort languages based on search term
  const filteredLanguages = React.useMemo(() => {
    try {
      if (!searchTerm) {
        return [...languages].sort((a, b) => a.localeCompare(b, 'fr'));
      }
      
      const normalizedSearchTerm = normalizeString(searchTerm);
      
      return [...languages]
        .filter(lang => {
          const normalizedLang = normalizeString(lang);
          return normalizedLang.includes(normalizedSearchTerm);
        })
        .sort((a, b) => {
          const normalizedA = normalizeString(a);
          const normalizedB = normalizeString(b);
          
          // Exact matches first
          const aExactMatch = normalizedA === normalizedSearchTerm;
          const bExactMatch = normalizedB === normalizedSearchTerm;
          
          if (aExactMatch && !bExactMatch) return -1;
          if (!aExactMatch && bExactMatch) return 1;
          
          // Then sort by whether it starts with the search term
          const aStartsWith = normalizedA.startsWith(normalizedSearchTerm);
          const bStartsWith = normalizedB.startsWith(normalizedSearchTerm);
          
          if (aStartsWith && !bStartsWith) return -1;
          if (!aStartsWith && bStartsWith) return 1;
          
          // Then alphabetical order
          return a.localeCompare(b, 'fr');
        });
    } catch (error) {
      console.error("Error filtering languages:", error);
      return [];
    }
  }, [languages, searchTerm]);

  // Common languages to highlight
  const commonLanguages = [
    "Français", "Anglais", "Espagnol", "Arabe", "Arabe Maghrébin", "Dari", "Pashto", "Farsi", 
    "Russe", "Chinois", "Allemand", "Italien", "Portugais"
  ];
  
  const isCommonLanguage = (lang: string) => commonLanguages.includes(lang);

  // Focus the search input on mount
  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, []);

  return (
    <div className={cn("w-full space-y-2", className)}>
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 pr-8"
          autoComplete="off"
        />
        {searchTerm && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-1 top-1 h-7 w-7 p-0 hover:bg-muted"
            onClick={() => setSearchTerm("")}
          >
            <X className="h-3.5 w-3.5" />
            <span className="sr-only">Effacer la recherche</span>
          </Button>
        )}
      </div>

      {/* Language list */}
      <div className="bg-background border rounded-md p-2">
        <ScrollArea className="max-h-[280px]">
          <div className="space-y-1">
            {/* All languages option */}
            {allLanguagesOption && (
              <Button
                variant={value === "all" ? "secondary" : "ghost"}
                className="w-full justify-start text-sm h-8 px-2"
                onClick={() => onChange("all")}
              >
                <div className="flex items-center space-x-2">
                  <div className={cn(
                    "h-3 w-3 rounded-full",
                    value === "all" ? "bg-primary" : "bg-muted"
                  )} />
                  <span>{allLanguagesLabel}</span>
                </div>
              </Button>
            )}
            
            {/* Common languages section */}
            {!searchTerm && (
              <>
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  Langues courantes
                </div>
                {commonLanguages
                  .filter(lang => languages.includes(lang))
                  .map((language) => (
                    <Button
                      key={language}
                      variant={value === language ? "secondary" : "ghost"}
                      className="w-full justify-start text-sm h-8 px-2"
                      onClick={() => onChange(language)}
                    >
                      <div className="flex items-center space-x-2">
                        <div className={cn(
                          "h-3 w-3 rounded-full",
                          value === language ? "bg-primary" : "bg-muted"
                        )} />
                        <span>{language}</span>
                      </div>
                    </Button>
                  ))
                }
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  Toutes les langues
                </div>
              </>
            )}
            
            {/* Filtered languages list */}
            {filteredLanguages.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filteredLanguages.map((language) => (
                // Skip common languages when not searching, as they're already shown above
                (!isCommonLanguage(language) || searchTerm) && (
                  <Button
                    key={language}
                    variant={value === language ? "secondary" : "ghost"}
                    className="w-full justify-start text-sm h-8 px-2"
                    onClick={() => onChange(language)}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={cn(
                        "h-3 w-3 rounded-full",
                        value === language ? "bg-primary" : "bg-muted"
                      )} />
                      <span>{language}</span>
                    </div>
                  </Button>
                )
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Selected language display */}
      {value && value !== "all" && (
        <Badge variant="secondary" className="bg-accent text-accent-foreground">
          {value}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-4 w-4 ml-1 p-0 rounded-full hover:bg-muted"
            onClick={() => onChange(allLanguagesOption ? "all" : "")}
          >
            <X className="h-2 w-2" />
            <span className="sr-only">Effacer la sélection</span>
          </Button>
        </Badge>
      )}
    </div>
  );
}
