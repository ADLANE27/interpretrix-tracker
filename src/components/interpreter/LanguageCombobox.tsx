
import React, { useState, useMemo, useCallback } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Sort languages alphabetically once
  const sortedLanguages = useMemo(() => 
    [...languages].sort((a, b) => a.localeCompare(b)),
  [languages]);
  
  // Filter languages based on search query
  const filteredLanguages = useMemo(() => {
    if (!searchQuery) return sortedLanguages;
    return sortedLanguages.filter(lang => 
      lang.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sortedLanguages, searchQuery]);
  
  // When displaying the selected value, handle the "all" special case
  const displayValue = value === "all" ? allLanguagesLabel : 
    sortedLanguages.find(lang => lang === value) || placeholder;
  
  // Handle search input
  const handleSearchChange = useCallback((input: string) => {
    setSearchQuery(input);
  }, []);
  
  // Handle language selection
  const handleSelectLanguage = useCallback((selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
    setSearchQuery("");
  }, [onChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          <span className="truncate">{displayValue}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={`Rechercher une langue...`} 
            className="h-9"
            value={searchQuery}
            onValueChange={handleSearchChange}
          />
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-auto">
            {allLanguagesOption && (
              <CommandItem
                key="all-languages"
                value="all"
                onSelect={() => handleSelectLanguage("all")}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === "all" ? "opacity-100" : "opacity-0"
                  )}
                />
                {allLanguagesLabel}
              </CommandItem>
            )}
            {filteredLanguages.map((language) => (
              <CommandItem
                key={language}
                value={language}
                onSelect={() => handleSelectLanguage(language)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === language ? "opacity-100" : "opacity-0"
                  )}
                />
                {language}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
