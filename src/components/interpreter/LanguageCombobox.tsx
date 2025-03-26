
import React, { useState, useMemo, useEffect, useRef } from "react";
import { Check, Search, X, ChevronDown, ChevronUp } from "lucide-react";
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
  const comboboxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
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

  // Get display value for selected value
  const displayValue = useMemo(() => {
    if (value === "all" && allLanguagesOption) {
      return allLanguagesLabel;
    }
    return value || placeholder;
  }, [value, allLanguagesOption, allLanguagesLabel, placeholder]);

  // Make the main button function as a search input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  // Handle click on the button
  const handleButtonClick = () => {
    setIsOpen(!isOpen);
    // Focus the input when opening
    if (!isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    }
  };

  // Handle selecting a language
  const handleSelectLanguage = (lang: string) => {
    onChange(lang);
    setIsOpen(false);
    setSearchTerm("");
  };

  // Handle clearing the selection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (value !== "all" && value !== "") {
      onChange(allLanguagesOption ? "all" : "");
      setSearchTerm("");
    }
  };

  // Common languages to highlight at the top of the list
  const commonLanguages = [
    "Français", "Anglais", "Espagnol", "Arabe", "Arabe Maghrébin", "Dari", "Pashto", "Farsi", 
    "Russe", "Chinois", "Allemand", "Italien", "Portugais"
  ];
  
  const isCommonLanguage = (lang: string) => commonLanguages.includes(lang);

  return (
    <div className="relative w-full" data-language-selector ref={comboboxRef}>
      {/* Main selector button/input */}
      <div className={cn(
        "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        isOpen && "ring-2 ring-ring ring-offset-2",
        className
      )}>
        <div className="flex flex-grow items-center gap-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input 
            ref={inputRef}
            type="text"
            className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground"
            placeholder={displayValue}
            value={searchTerm}
            onChange={handleInputChange}
            onClick={() => !isOpen && setIsOpen(true)}
          />
        </div>
        <div className="flex items-center gap-1">
          {value && value !== "all" && allLanguagesOption && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5 rounded-full p-0 hover:bg-muted"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Effacer la sélection</span>
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 p-0"
            onClick={handleButtonClick}
          >
            {isOpen ? 
              <ChevronUp className="h-4 w-4 shrink-0 opacity-50" /> : 
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            }
          </Button>
        </div>
      </div>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 z-[100] w-full mt-1 rounded-md border border-input bg-popover shadow-lg animate-in fade-in-80 zoom-in-95">
          {/* Language list */}
          <ScrollArea className="max-h-[300px] overflow-auto">
            <div className="p-1">
              {allLanguagesOption && (
                <Button
                  variant={value === "all" ? "secondary" : "ghost"}
                  className="w-full justify-between font-normal mb-1 h-9"
                  onClick={() => handleSelectLanguage("all")}
                >
                  <span>{allLanguagesLabel}</span>
                  {value === "all" && <Check className="h-4 w-4" />}
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
                        className="w-full justify-between font-normal mb-1 h-9"
                        onClick={() => handleSelectLanguage(language)}
                      >
                        <span>{language}</span>
                        {value === language && <Check className="h-4 w-4" />}
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
                      className="w-full justify-between font-normal mb-1 h-9"
                      onClick={() => handleSelectLanguage(language)}
                    >
                      <span>{language}</span>
                      {value === language && <Check className="h-4 w-4" />}
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
