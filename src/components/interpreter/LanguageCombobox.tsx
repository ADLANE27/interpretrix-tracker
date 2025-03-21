
import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    inputRef.current?.focus();
  };

  const handleSelectLanguage = (language: string) => {
    onChange(language);
    setSearchQuery("");
    setIsOpen(false);
  };

  // Focus the input when dropdown is opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div 
        className={cn(
          "flex items-center w-full border rounded-md h-10 px-3 py-2 bg-background",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background",
          "border-input hover:border-purple-400 transition-all duration-200",
          { "ring-2 ring-ring": isOpen },
          className
        )}
        onClick={() => setIsOpen(true)}
      >
        <Search className="w-4 h-4 mr-2 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          className="w-full bg-transparent focus:outline-none placeholder:text-muted-foreground/60 text-sm"
          placeholder={value ? value : placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
        />
        {(searchQuery || value !== "all") && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClearSearch();
              if (value !== "all") onChange("all");
            }}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div 
          className="absolute z-[9999] w-full mt-1 bg-popover border rounded-md shadow-lg"
          style={{ maxHeight: "350px", overflow: "hidden" }}
        >
          <ScrollArea className="h-72 w-full">
            <div className="p-1">
              {allLanguagesOption && (
                <div
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-3 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                    { "bg-accent text-accent-foreground": value === "all" }
                  )}
                  onClick={() => handleSelectLanguage("all")}
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    {value === "all" && (
                      <span className="h-4 w-4 flex items-center">✓</span>
                    )}
                  </span>
                  {allLanguagesLabel}
                </div>
              )}
              
              {/* Common languages section */}
              {filteredCommonLanguages.length > 0 && !searchQuery && (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Langues courantes
                  </div>
                  {filteredCommonLanguages.map((language) => (
                    <div
                      key={`common-${language}`}
                      className={cn(
                        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-3 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                        { "bg-accent text-accent-foreground": value === language }
                      )}
                      onClick={() => handleSelectLanguage(language)}
                    >
                      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                        {value === language && (
                          <span className="h-4 w-4 flex items-center">✓</span>
                        )}
                      </span>
                      {language}
                    </div>
                  ))}
                  
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Toutes les langues
                  </div>
                </>
              )}
              
              {/* When searching, show common languages that match without headers */}
              {filteredCommonLanguages.length > 0 && searchQuery && (
                filteredCommonLanguages.map((language) => (
                  <div
                    key={`common-${language}`}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-3 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                      { "bg-accent text-accent-foreground": value === language }
                    )}
                    onClick={() => handleSelectLanguage(language)}
                  >
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      {value === language && (
                        <span className="h-4 w-4 flex items-center">✓</span>
                      )}
                    </span>
                    {language}
                  </div>
                ))
              )}
              
              {/* All languages */}
              {filteredLanguages.map((language) => (
                // Skip languages that are already in the common languages section
                (!availableCommonLanguages.includes(language) || searchQuery) && (
                  <div
                    key={language}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-3 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                      { "bg-accent text-accent-foreground": value === language }
                    )}
                    onClick={() => handleSelectLanguage(language)}
                  >
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      {value === language && (
                        <span className="h-4 w-4 flex items-center">✓</span>
                      )}
                    </span>
                    {language}
                  </div>
                )
              ))}

              {/* Show message when no languages match the search */}
              {filteredLanguages.length === 0 && (
                <div className="px-2 py-4 text-sm text-center text-muted-foreground">
                  Aucune langue trouvée
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
