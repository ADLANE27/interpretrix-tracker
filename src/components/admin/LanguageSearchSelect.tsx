
import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
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
import { LANGUAGES } from "@/lib/constants";

interface LanguageSearchSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
}

export function LanguageSearchSelect({
  value,
  onValueChange,
  placeholder = "Rechercher une langue...",
  emptyMessage = "Aucune langue trouvée.",
  className,
}: LanguageSearchSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  
  // Create a safe copy of LANGUAGES with error handling
  const languages = React.useMemo(() => {
    try {
      return Array.isArray(LANGUAGES) ? LANGUAGES : [];
    } catch (error) {
      console.error("Failed to load languages:", error);
      return [];
    }
  }, []);
  
  // Create language options with "all" option first
  const languageOptions = React.useMemo(() => {
    return [
      { value: "all", label: "Toutes les langues" },
      ...languages.map(lang => ({ value: lang, label: lang }))
    ];
  }, [languages]);
  
  // Get the currently selected language label
  const selectedLabel = React.useMemo(() => {
    const selected = languageOptions.find(option => option.value === value);
    return selected ? selected.label : "Toutes les langues";
  }, [value, languageOptions]);
  
  // Filter languages based on input
  const filteredOptions = React.useMemo(() => {
    const query = inputValue.toLowerCase().trim();
    if (!query) return languageOptions;
    
    return languageOptions.filter(option => 
      option.label.toLowerCase().includes(query)
    );
  }, [languageOptions, inputValue]);
  
  // Handle selection of a language
  const handleSelect = React.useCallback((currentValue: string) => {
    onValueChange(currentValue === value ? "all" : currentValue);
    setOpen(false);
  }, [onValueChange, value]);
  
  // Reset search input when popover closes
  React.useEffect(() => {
    if (!open) {
      // Small delay to avoid flashing empty content before closing
      setTimeout(() => setInputValue(""), 100);
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          onClick={() => setOpen(prev => !prev)}
          type="button"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{selectedLabel}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command className="w-full">
          <CommandInput 
            placeholder={placeholder} 
            value={inputValue}
            onValueChange={setInputValue}
            autoFocus
          />
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-auto">
            {filteredOptions.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={handleSelect}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === option.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
