
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
      
      return [...languages]
        .filter(lang => {
          const normalizedLang = normalizeString(lang);
          return !searchTerm || normalizedLang.includes(normalizedSearchTerm);
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
        <div className="absolute top-full left-0 z-[9999] w-full mt-1 rounded-md border border-input bg-white dark:bg-gray-800 shadow-lg">
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
