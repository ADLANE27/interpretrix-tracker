import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

const specializations = [
  { value: "medical", label: "Médical" },
  { value: "legal", label: "Juridique" },
  { value: "technical", label: "Technique" },
  { value: "conference", label: "Conférence" },
  { value: "business", label: "Commercial" },
  { value: "education", label: "Éducation" },
  { value: "social_services", label: "Services sociaux" },
  { value: "immigration", label: "Immigration" },
  { value: "mental_health", label: "Santé mentale" },
  { value: "financial", label: "Finance" },
  { value: "diplomatic", label: "Diplomatique" },
];

interface SpecializationSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  isEditing?: boolean;
}

export const SpecializationSelector = ({
  value,
  onChange,
  isEditing = true,
}: SpecializationSelectorProps) => {
  const [open, setOpen] = useState(false);

  const toggleSpecialization = (specialization: string) => {
    if (value.includes(specialization)) {
      onChange(value.filter((s) => s !== specialization));
    } else {
      onChange([...value, specialization]);
    }
  };

  if (!isEditing) {
    return (
      <div className="flex flex-wrap gap-2">
        {value.map((spec) => (
          <Badge key={spec} variant="secondary">
            {specializations.find((s) => s.value === spec)?.label || spec}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            Sélectionner des spécialisations
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command className="w-full">
            <CommandInput placeholder="Rechercher une spécialisation..." />
            <CommandEmpty>Aucune spécialisation trouvée.</CommandEmpty>
            <CommandGroup>
              {specializations.map((spec) => (
                <CommandItem
                  key={spec.value}
                  value={spec.value}
                  onSelect={() => toggleSpecialization(spec.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.includes(spec.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {spec.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      <div className="flex flex-wrap gap-2">
        {value.map((spec) => (
          <Badge
            key={spec}
            variant="secondary"
            className="cursor-pointer"
            onClick={() => toggleSpecialization(spec)}
          >
            {specializations.find((s) => s.value === spec)?.label || spec} ×
          </Badge>
        ))}
      </div>
    </div>
  );
};