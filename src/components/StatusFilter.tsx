
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
      color: "from-green-400/80 to-green-600/80", 
      icon: Clock 
    },
    { 
      id: "busy", 
      label: "En appel", 
      color: "from-violet-400/80 to-violet-600/80", 
      icon: Phone 
    },
    { 
      id: "pause", 
      label: "En pause", 
      color: "from-orange-400/80 to-orange-600/80", 
      icon: Coffee 
    },
    { 
      id: "unavailable", 
      label: "Indisponible", 
      color: "from-red-400/80 to-red-600/80", 
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
    <div className="flex flex-wrap gap-3 justify-center">
      {statuses.map((status) => {
        const Icon = status.icon;
        return (
          <Button
            key={status.id}
            variant={selectedStatus === status.id ? "default" : "outline"}
            className={`
              transition-all duration-200 rounded-full px-5
              ${selectedStatus === status.id 
                ? `bg-gradient-to-r ${status.color} text-white shadow-md purple-glow` 
                : 'glass-button hover:bg-white/10'}
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
