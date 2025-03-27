
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
      const normalizedSearchTerm = normalizeString(searchTerm);
      
      if (!normalizedSearchTerm) {
        return [...languages].sort((a, b) => a.localeCompare(b, 'fr'));
      }
      
      // Catégoriser les langues
      const exactMatches: string[] = [];
      const startsWithMatches: string[] = [];
      const containsMatches: string[] = [];
      
      languages.forEach(lang => {
        const normalizedLang = normalizeString(lang);
        
        // Correspondance exacte
        if (normalizedLang === normalizedSearchTerm) {
          exactMatches.push(lang);
        }
        // Commence par le terme de recherche
        else if (normalizedLang.startsWith(normalizedSearchTerm)) {
          startsWithMatches.push(lang);
        }
        // Contient le terme de recherche, mais pas au début
        else if (normalizedLang.includes(normalizedSearchTerm)) {
          containsMatches.push(lang);
        }
      });
      
      // Trier chaque catégorie alphabétiquement
      exactMatches.sort((a, b) => a.localeCompare(b, 'fr'));
      startsWithMatches.sort((a, b) => a.localeCompare(b, 'fr'));
      containsMatches.sort((a, b) => a.localeCompare(b, 'fr'));
      
      // Combiner toutes les catégories dans l'ordre de priorité
      return [...exactMatches, ...startsWithMatches, ...containsMatches];
    } catch (error) {
      console.error("Error filtering languages:", error);
      return [];
    }
  }, [languages, searchTerm]);

  // Handling search and selection
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value;
    setSearchTerm(searchValue);
    setIsOpen(true);
  };

  const handleSelectLanguage = (lang: string) => {
    onChange(lang);
    setIsOpen(false);
    setSearchTerm("");
  };

  // Render
  return (
    <div className="relative w-full" ref={comboboxRef}>
      <div 
        className={cn(
          "flex w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          isOpen && "ring-2 ring-ring ring-offset-2",
          className
        )}
      >
        <Search className="mr-2 h-4 w-4 text-muted-foreground" />
        <input 
          ref={inputRef}
          type="text"
          placeholder={value && value !== "all" ? value : placeholder}
          value={searchTerm}
          onChange={handleSearchChange}
          onClick={() => setIsOpen(true)}
          className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground"
        />
        {isOpen ? <ChevronUp className="ml-2 h-4 w-4 opacity-50" /> : <ChevronDown className="ml-2 h-4 w-4 opacity-50" />}
      </div>
      
      {isOpen && (
        <div className="absolute bottom-full left-0 z-[9999] w-full mb-1 rounded-md border border-input bg-white dark:bg-gray-800 shadow-lg">
          <ScrollArea className="max-h-[300px]">
            <div className="p-1">
              {/* Optional: All languages option */}
              {allLanguagesOption && (
                <Button
                  variant={value === "all" ? "secondary" : "ghost"}
                  className="w-full justify-between"
                  onClick={() => handleSelectLanguage("all")}
                >
                  {allLanguagesLabel}
                  {value === "all" && <Check className="h-4 w-4" />}
                </Button>
              )}

              {filteredLanguages.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground p-4">
                  {emptyMessage}
                </div>
              ) : (
                filteredLanguages.map((language) => (
                  <Button
                    key={language}
                    variant={value === language ? "secondary" : "ghost"}
                    className="w-full justify-between"
                    onClick={() => handleSelectLanguage(language)}
                  >
                    {language}
                    {value === language && <Check className="h-4 w-4" />}
                  </Button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

