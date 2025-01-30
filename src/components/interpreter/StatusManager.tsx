import { Button } from "@/components/ui/button";

interface StatusManagerProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
}

const statusConfig = {
  available: { color: "bg-interpreter-available text-white", label: "Disponible" },
  unavailable: { color: "bg-interpreter-unavailable text-white", label: "Indisponible" },
  pause: { color: "bg-interpreter-pause text-white", label: "En pause" },
  busy: { color: "bg-interpreter-busy text-white", label: "En appel" },
};

export const StatusManager = ({ currentStatus, onStatusChange }: StatusManagerProps) => {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Gérer ma disponibilité</h3>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {Object.entries(statusConfig).map(([key, value]) => (
          <Button
            key={key}
            onClick={() => onStatusChange(key)}
            variant={currentStatus === key ? "default" : "outline"}
            className={currentStatus === key ? value.color : ""}
          >
            {value.label}
          </Button>
        ))}
      </div>
    </div>
  );
};