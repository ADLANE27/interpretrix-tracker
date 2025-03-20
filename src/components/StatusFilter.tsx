
import { Button } from "@/components/ui/button";
import { Clock, Coffee, Phone, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface StatusFilterProps {
  selectedStatus: string | null;
  onStatusChange: (status: string | null) => void;
  className?: string;
}

export const StatusFilter = ({ selectedStatus, onStatusChange, className = "" }: StatusFilterProps) => {
  const isMobile = useIsMobile();
  const statuses = [
    { 
      id: "available", 
      label: "Disponible", 
      mobileLabel: "Dispo",
      color: "from-green-400 to-green-600", 
      icon: Clock 
    },
    { 
      id: "busy", 
      label: "En appel", 
      mobileLabel: "Appel",
      color: "from-violet-400 to-violet-600", 
      icon: Phone 
    },
    { 
      id: "pause", 
      label: "En pause", 
      mobileLabel: "Pause",
      color: "from-orange-400 to-orange-600", 
      icon: Coffee 
    },
    { 
      id: "unavailable", 
      label: "Indisponible", 
      mobileLabel: "Indispo",
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
    <div className={`flex flex-wrap justify-center gap-2 ${className}`}>
      {statuses.map((status) => {
        const Icon = status.icon;
        return (
          <Button
            key={status.id}
            variant={selectedStatus === status.id ? "default" : "outline"}
            className={`
              transition-all duration-200 rounded-full h-10 
              ${isMobile ? 'px-2 text-xs' : 'px-4 text-sm'}
              ${selectedStatus === status.id 
                ? `bg-gradient-to-r ${status.color} text-white shadow-md` 
                : 'hover:bg-slate-100 dark:hover:bg-slate-800'}
            `}
            onClick={() => handleStatusClick(status.id)}
          >
            <Icon className={`${isMobile ? 'h-3 w-3 mr-0.5' : 'h-3.5 w-3.5 mr-1'} min-w-[12px] flex-shrink-0`} />
            <span className="truncate whitespace-nowrap">
              {isMobile ? status.mobileLabel : status.label}
            </span>
          </Button>
        )}
      )}
    </div>
  );
};
