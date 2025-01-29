import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface StatusFilterProps {
  selectedStatuses: string[];
  onStatusChange: (status: string) => void;
}

export const StatusFilter = ({ selectedStatuses, onStatusChange }: StatusFilterProps) => {
  const statuses = [
    { id: "available", label: "Disponible", color: "bg-interpreter-available" },
    { id: "busy", label: "En appel", color: "bg-interpreter-busy" },
    { id: "pause", label: "En pause", color: "bg-interpreter-pause" },
    { id: "unavailable", label: "Indisponible", color: "bg-interpreter-unavailable" },
  ];

  return (
    <div className="flex flex-wrap gap-2 p-4">
      {statuses.map((status) => (
        <Button
          key={status.id}
          variant="outline"
          className={`${
            selectedStatuses.includes(status.id)
              ? `${status.color} text-white`
              : "bg-white"
          }`}
          onClick={() => onStatusChange(status.id)}
        >
          {selectedStatuses.includes(status.id) && (
            <Check className="mr-2 h-4 w-4" />
          )}
          {status.label}
        </Button>
      ))}
    </div>
  );
};