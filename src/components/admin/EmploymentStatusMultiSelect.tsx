
import { useEffect, useState } from "react";
import { CheckSquare, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { EmploymentStatus, getEmploymentStatusOptions } from "@/utils/employmentStatus";

interface EmploymentStatusMultiSelectProps {
  selectedStatuses: EmploymentStatus[];
  onChange: (selectedStatuses: EmploymentStatus[]) => void;
}

export const EmploymentStatusMultiSelect = ({
  selectedStatuses,
  onChange
}: EmploymentStatusMultiSelectProps) => {
  const [open, setOpen] = useState(false);
  const statusOptions = getEmploymentStatusOptions();
  
  const handleSelect = (status: EmploymentStatus) => {
    if (selectedStatuses.includes(status)) {
      onChange(selectedStatuses.filter(item => item !== status));
    } else {
      onChange([...selectedStatuses, status]);
    }
  };

  const handleClear = () => {
    onChange([]);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-10 justify-between"
        >
          {selectedStatuses.length > 0 
            ? `${selectedStatuses.length} statut${selectedStatuses.length > 1 ? 's' : ''} sélectionné${selectedStatuses.length > 1 ? 's' : ''}`
            : "Statut professionnel"}
          <div className="ml-2 flex gap-1">
            {selectedStatuses.length > 0 && (
              <X 
                className="h-4 w-4 text-muted-foreground hover:text-foreground" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
              />
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Rechercher un statut..." />
          <CommandEmpty>Aucun statut trouvé.</CommandEmpty>
          <CommandGroup>
            {statusOptions.map((option) => {
              const isSelected = selectedStatuses.includes(option.value);
              return (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleSelect(option.value)}
                  className="flex items-center gap-2"
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  {option.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
          {selectedStatuses.length > 0 && (
            <div className="border-t p-2">
              <Button
                variant="ghost"
                className="w-full justify-start text-sm"
                onClick={handleClear}
              >
                Tout effacer
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
};
