
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
      color: "from-green-400 to-green-600", 
      icon: Clock,
      hoverColor: "hover:bg-green-100/10" 
    },
    { 
      id: "busy", 
      label: "En appel", 
      color: "from-palette-vivid-purple to-indigo-600", 
      icon: Phone,
      hoverColor: "hover:bg-purple-100/10" 
    },
    { 
      id: "pause", 
      label: "En pause", 
      color: "from-palette-bright-orange to-amber-600", 
      icon: Coffee,
      hoverColor: "hover:bg-orange-100/10" 
    },
    { 
      id: "unavailable", 
      label: "Indisponible", 
      color: "from-red-400 to-rose-600", 
      icon: X,
      hoverColor: "hover:bg-red-100/10" 
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
              relative overflow-hidden transition-all duration-300 rounded-full px-5
              ${selectedStatus === status.id 
                ? `bg-gradient-to-r ${status.color} text-white shadow-md border-transparent` 
                : `border border-white/10 bg-black/20 backdrop-blur-sm text-white/90 ${status.hoverColor}`}
            `}
            onClick={() => handleStatusClick(status.id)}
          >
            {selectedStatus === status.id && (
              <span className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-50"></span>
            )}
            <Icon className="mr-2 h-4 w-4" />
            <span className="font-medium drop-shadow-sm">{status.label}</span>
          </Button>
        )}
      )}
    </div>
  );
};
