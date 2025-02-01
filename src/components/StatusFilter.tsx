import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface StatusFilterProps {
  selectedStatus: string | null;
  onStatusChange: (status: string | null) => void;
}

export const StatusFilter = ({ selectedStatus, onStatusChange }: StatusFilterProps) => {
  const statuses = [
    { id: "available", label: "Disponible", color: "bg-interpreter-available" },
    { id: "busy", label: "En appel", color: "bg-interpreter-busy" },
    { id: "pause", label: "En pause", color: "bg-interpreter-pause" },
    { id: "unavailable", label: "Indisponible", color: "bg-interpreter-unavailable" },
  ];

  const handleStatusClick = (statusId: string) => {
    // If clicking the already selected status, deselect it
    if (selectedStatus === statusId) {
      onStatusChange(null);
    } else {
      // Otherwise, select the new status
      onStatusChange(statusId);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 p-4">
      {statuses.map((status) => (
        <Button
          key={status.id}
          variant="outline"
          className={`${
            selectedStatus === status.id
              ? `${status.color} text-white`
              : "bg-white"
          }`}
          onClick={() => handleStatusClick(status.id)}
        >
          {selectedStatus === status.id && (
            <Check className="mr-2 h-4 w-4" />
          )}
          {status.label}
        </Button>
      ))}
    </div>
  );
};
