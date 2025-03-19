
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
  const [searchQuery, setSearchQuery] = React.useState("");
  
  // Safely create language options and memoize to prevent unnecessary re-renders
  const languageOptions = React.useMemo(() => {
    // Ensure LANGUAGES is an array and handle potential undefined/null
    const safeLanguages = Array.isArray(LANGUAGES) ? LANGUAGES : [];
    
    return [
      { value: "all", label: "Toutes les langues" },
      ...safeLanguages.map(lang => ({ value: lang, label: lang }))
    ];
  }, []);
  
  // Get the currently selected option
  const selectedOption = languageOptions.find((option) => option.value === value);
  
  // Filter languages based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return languageOptions;
    
    return languageOptions.filter(option => 
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [languageOptions, searchQuery]);
  
  // Reset search when popover closes
  React.useEffect(() => {
    if (!open) {
      setSearchQuery("");
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
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput 
            placeholder={placeholder} 
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="h-9"
          />
          {filteredOptions.length === 0 && (
            <CommandEmpty>{emptyMessage}</CommandEmpty>
          )}
          <CommandGroup className="max-h-[300px] overflow-y-auto">
            {filteredOptions.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={(currentValue) => {
                  // Handle value selection
                  onValueChange(currentValue === value ? "all" : currentValue);
                  
                  // Close the popover and reset search
                  setOpen(false);
                  setSearchQuery("");
                }}
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
