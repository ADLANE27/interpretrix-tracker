
import React from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-80 overflow-y-auto z-[200]">
        {allLanguagesOption && (
          <SelectItem value="all">{allLanguagesLabel}</SelectItem>
        )}
        
        {/* Common languages section */}
        {availableCommonLanguages.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Langues courantes
            </div>
            {availableCommonLanguages.map((language) => (
              <SelectItem key={`common-${language}`} value={language}>
                {language}
              </SelectItem>
            ))}
            
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Toutes les langues
            </div>
          </>
        )}
        
        {/* All languages */}
        {sortedLanguages.map((language) => (
          // Skip languages that are already in the common languages section
          !availableCommonLanguages.includes(language) && (
            <SelectItem key={language} value={language}>
              {language}
            </SelectItem>
          )
        ))}
      </SelectContent>
    </Select>
  );
}
