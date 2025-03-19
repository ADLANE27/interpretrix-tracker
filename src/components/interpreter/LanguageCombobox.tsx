
import React, { useState, useMemo, useEffect } from "react";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
        return [...languages].sort((a, b) => a.localeCompare(b));
      }
      
      return [...languages]
        .filter(lang => 
          lang.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => a.localeCompare(b));
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
          <div className="max-h-[200px] overflow-auto p-1">
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
            
            {filteredLanguages.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filteredLanguages.map((language) => (
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
