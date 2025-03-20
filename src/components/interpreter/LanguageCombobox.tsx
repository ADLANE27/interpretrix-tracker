
import React, { useState, useMemo, useEffect } from "react";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-language-selector]")) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // Reset search when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  // Sort and filter languages
  const filteredLanguages = useMemo(() => {
    try {
      if (!searchTerm) {
        return [...languages].sort((a, b) => a.localeCompare(b, 'fr'));
      }
      
      const searchTermLower = searchTerm.toLowerCase();
      
      return [...languages]
        .filter(lang => {
          const langLower = lang.toLowerCase();
          return langLower.includes(searchTermLower);
        })
        .sort((a, b) => {
          const aLower = a.toLowerCase();
          const bLower = b.toLowerCase();
          
          // Exact matches first
          const aExactMatch = aLower === searchTermLower;
          const bExactMatch = bLower === searchTermLower;
          
          if (aExactMatch && !bExactMatch) return -1;
          if (!aExactMatch && bExactMatch) return 1;
          
          // Then sort by whether it starts with the search term
          const aStartsWith = aLower.startsWith(searchTermLower);
          const bStartsWith = bLower.startsWith(searchTermLower);
          
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

  // Handle selecting a language
  const handleSelectLanguage = (lang: string) => {
    onChange(lang);
    setIsOpen(false);
    setSearchTerm("");
  };

  // Common languages to highlight at the top of the list
  const commonLanguages = [
    "Français", "Anglais", "Espagnol", "Arabe", "Dari", "Pashto", "Farsi", 
    "Russe", "Chinois", "Allemand", "Italien", "Portugais"
  ];
  
  const isCommonLanguage = (lang: string) => commonLanguages.includes(lang);

  return (
    <div className="relative w-full" data-language-selector>
      {/* Main selector button */}
      <Button
        type="button"
        variant="outline"
        role="combobox"
        className={cn(
          "w-full justify-between text-left font-normal",
          !value && "text-muted-foreground",
          className
        )}
        onClick={handleButtonClick}
        aria-expanded={isOpen}
      >
        <span className="truncate">{displayValue}</span>
        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 z-50 w-full mt-1 rounded-md border border-input bg-white shadow-lg">
          {/* Search input */}
          <div className="p-2 border-b">
            <Input
              autoFocus
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8"
            />
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
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Langues courantes
                  </div>
                  {commonLanguages
                    .filter(lang => languages.includes(lang))
                    .map((language) => (
                      <Button
                        key={language}
                        variant={value === language ? "secondary" : "ghost"}
                        className="w-full justify-start font-normal mb-1"
                        onClick={() => handleSelectLanguage(language)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === language ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {language}
                      </Button>
                    ))
                  }
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Toutes les langues
                  </div>
                </>
              )}
              
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
                      className="w-full justify-start font-normal mb-1"
                      onClick={() => handleSelectLanguage(language)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === language ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {language}
                    </Button>
                  )
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
