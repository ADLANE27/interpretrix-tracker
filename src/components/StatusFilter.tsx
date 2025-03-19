
import { Button } from "@/components/ui/button";
import { Clock, Coffee, Phone, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface StatusFilterProps {
  selectedStatus: string | null;
  onStatusChange: (status: string | null) => void;
}

export const StatusFilter = ({ selectedStatus, onStatusChange }: StatusFilterProps) => {
  const isMobile = useIsMobile();
  const statuses = [
    { 
      id: "available", 
      label: "Disponible", 
      color: "from-green-400 to-green-600", 
      icon: Clock 
    },
    { 
      id: "busy", 
      label: "En appel", 
      color: "from-violet-400 to-violet-600", 
      icon: Phone 
    },
    { 
      id: "pause", 
      label: "En pause", 
      color: "from-orange-400 to-orange-600", 
      icon: Coffee 
    },
    { 
      id: "unavailable", 
      label: "Indisponible", 
      color: "from-red-400 to-red-600", 
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
    <div className="flex flex-wrap justify-center gap-2">
      {statuses.map((status) => {
        const Icon = status.icon;
        return (
          <Button
            key={status.id}
            variant={selectedStatus === status.id ? "default" : "outline"}
            className={`
              transition-all duration-200 rounded-full h-12 
              ${isMobile ? 'px-4 text-base' : 'px-4 text-sm'}
              ${selectedStatus === status.id 
                ? `bg-gradient-to-r ${status.color} text-white shadow-md` 
                : 'hover:bg-slate-100 dark:hover:bg-slate-800'}
            `}
            onClick={() => handleStatusClick(status.id)}
          >
            <Icon className="mr-2 h-4 w-4 min-w-[16px] flex-shrink-0" />
            <span className="truncate whitespace-nowrap">{status.label}</span>
          </Button>
        )}
      )}
    </div>
  );
};
