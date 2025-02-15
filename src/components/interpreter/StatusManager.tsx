
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  CheckCircle2, 
  XCircle, 
  PauseCircle
} from "lucide-react";

interface StatusManagerProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
}

const statusConfig = {
  available: { 
    color: "bg-interpreter-available hover:bg-green-600",
    label: "Disponible",
    icon: CheckCircle2
  },
  unavailable: { 
    color: "bg-interpreter-unavailable hover:bg-red-600",
    label: "Indisponible",
    icon: XCircle
  },
  pause: { 
    color: "bg-interpreter-pause hover:bg-orange-600",
    label: "En pause",
    icon: PauseCircle
  }
};

export const StatusManager = ({ currentStatus, onStatusChange }: StatusManagerProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        Gérer ma disponibilité
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Object.entries(statusConfig).map(([key, value]) => {
          const Icon = value.icon;
          return (
            <Button
              key={key}
              onClick={() => onStatusChange(key)}
              variant={currentStatus === key ? "default" : "outline"}
              className={`
                h-auto py-3 px-4
                ${currentStatus === key ? `${value.color} text-white` : 'hover:bg-gray-50'}
                transition-all duration-200
              `}
            >
              <Icon className={`h-5 w-5 ${currentStatus === key ? 'text-white' : 'text-gray-500'} mr-2`} />
              <span className="font-medium">{value.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};
