
import { Button } from "@/components/ui/button";
import { Clock, Coffee, Phone, X } from "lucide-react";

interface StatusFilterProps {
  selectedStatus: string | null;
  onStatusChange: (status: string | null) => void;
}

export const StatusFilter = ({ selectedStatus, onStatusChange }: StatusFilterProps) => {
  const statuses = [
    { 
      id: "available", 
      label: "Disponible", 
      color: "bg-interpreter-available", 
      icon: Clock 
    },
    { 
      id: "busy", 
      label: "En appel", 
      color: "bg-interpreter-busy", 
      icon: Phone 
    },
    { 
      id: "pause", 
      label: "En pause", 
      color: "bg-interpreter-pause", 
      icon: Coffee 
    },
    { 
      id: "unavailable", 
      label: "Indisponible", 
      color: "bg-interpreter-unavailable", 
      icon: X 
    },
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
    <div className="flex flex-wrap gap-2 p-4 justify-center">
      {statuses.map((status) => {
        const Icon = status.icon;
        return (
          <Button
            key={status.id}
            variant="outline"
            className={`
              transition-all duration-200 whitespace-nowrap min-w-[120px]
              ${selectedStatus === status.id ? `${status.color} text-white shadow-lg` : 'bg-white dark:bg-gray-950'}
            `}
            onClick={() => handleStatusClick(status.id)}
          >
            <Icon className="mr-2 h-4 w-4" />
            {status.label}
          </Button>
        )}
      )}
    </div>
  );
};
