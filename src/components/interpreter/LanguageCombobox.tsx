
import React, { useState, useMemo, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

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
  emptyMessage = "Aucune langue trouvée.",
  className,
  allLanguagesOption = true,
  allLanguagesLabel = "Toutes les langues",
}: LanguageComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);
  
  // Reset search when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Normalize a string for comparison (remove accents, lowercase)
  const normalizeString = (str: string): string => {
    return str.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  };

  // Sort and filter languages
  const filteredLanguages = useMemo(() => {
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

  // Get display name for selected value
  const displayValue = useMemo(() => {
    if (value === "all" && allLanguagesOption) {
      return allLanguagesLabel;
    }
    return value || placeholder;
  }, [value, allLanguagesOption, allLanguagesLabel, placeholder]);

  // Handle clicking the main button
  const handleButtonClick = () => {
    setIsOpen(!isOpen);
  };

  // Handle clearing the selection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  // Handle selecting a language
  const handleSelectLanguage = (lang: string) => {
    onChange(lang);
    setIsOpen(false);
    setSearchTerm("");
  };

  // Common languages to highlight at the top of the list
  const commonLanguages = [
    "Français", "Anglais", "Espagnol", "Arabe", "Arabe Maghrébin", "Dari", "Pashto", "Farsi", 
    "Russe", "Chinois", "Allemand", "Italien", "Portugais"
  ];
  
  const isCommonLanguage = (lang: string) => commonLanguages.includes(lang);

  return (
    <div className={cn("relative w-full", className)} ref={containerRef} data-language-selector>
      {/* Main selector button */}
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={isOpen}
        className={cn(
          "w-full flex items-center justify-between text-left font-normal",
          !value && "text-muted-foreground",
          "pr-2" // Reduced right padding to accommodate clear button
        )}
        onClick={handleButtonClick}
      >
        <span className="truncate flex-grow">{displayValue}</span>
        <div className="flex items-center gap-1">
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
              onClick={handleClear}
              aria-label="Effacer la sélection"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
          <ChevronsUpDown className="h-4 w-4 opacity-50 ml-1 shrink-0" />
        </div>
      </Button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 z-50 w-full mt-1 rounded-md border border-input bg-white dark:bg-gray-800 shadow-lg">
          {/* Search input */}
          <div className="p-2 border-b relative">
            <Input
              ref={inputRef}
              autoFocus
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-8"
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            {searchTerm && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 absolute right-4 top-1/2 transform -translate-y-1/2 p-0"
                onClick={() => setSearchTerm("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          {/* Language list */}
          <ScrollArea className="max-h-[300px] overflow-auto">
            <div className="p-1">
              {allLanguagesOption && (
                <Button
                  variant={value === "all" ? "secondary" : "ghost"}
                  className="w-full justify-start font-normal mb-1"
                  onClick={() => handleSelectLanguage("all")}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === "all" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {allLanguagesLabel}
                </Button>
              )}
              
              {/* Common languages section (if not searching) */}
              {!searchTerm && (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground bg-gray-50 dark:bg-gray-700">
                    Langues courantes
                  </div>
                  <div className="p-2 grid grid-cols-2 gap-1">
                    {commonLanguages
                      .filter(lang => languages.includes(lang))
                      .map((language) => (
                        <Button
                          key={language}
                          variant={value === language ? "secondary" : "outline"}
                          size="sm"
                          className={cn(
                            "justify-start font-normal h-auto py-1.5 text-left truncate",
                            value === language ? "bg-primary/20 border-primary/30" : ""
                          )}
                          onClick={() => handleSelectLanguage(language)}
                        >
                          <Check
                            className={cn(
                              "mr-1 h-3.5 w-3.5 flex-shrink-0",
                              value === language ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="truncate">{language}</span>
                        </Button>
                      ))
                    }
                  </div>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground bg-gray-50 dark:bg-gray-700">
                    Toutes les langues
                  </div>
                </>
              )}
              
              {/* Show quick notice if we have search results */}
              {searchTerm && filteredLanguages.length > 0 && (
                <div className="px-2 py-1 text-xs text-muted-foreground">
                  {filteredLanguages.length} résultat{filteredLanguages.length > 1 ? 's' : ''}
                </div>
              )}
              
              {filteredLanguages.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : (
                <div className={cn(
                  searchTerm ? "p-1" : "px-1 py-0",
                  "grid",
                  searchTerm ? "grid-cols-1" : "grid-cols-2 md:grid-cols-3 gap-1"
                )}>
                  {filteredLanguages.map((language) => (
                    // Skip common languages when not searching, as they're already shown above
                    (!isCommonLanguage(language) || searchTerm) && (
                      <Button
                        key={language}
                        variant={value === language ? "secondary" : searchTerm ? "ghost" : "outline"}
                        size="sm"
                        className={cn(
                          "justify-start font-normal mb-1 truncate",
                          searchTerm ? "h-9" : "h-auto py-1.5",
                          value === language && !searchTerm ? "bg-primary/20 border-primary/30" : ""
                        )}
                        onClick={() => handleSelectLanguage(language)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-3.5 w-3.5 flex-shrink-0",
                            value === language ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="truncate">{language}</span>
                      </Button>
                    )
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
