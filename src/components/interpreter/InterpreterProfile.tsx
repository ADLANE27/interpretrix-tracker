import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

type Status = "available" | "busy" | "pause" | "unavailable";

export const InterpreterProfile = () => {
  const [status, setStatus] = useState<Status>("available");
  const { toast } = useToast();

  const handleStatusChange = (newStatus: Status) => {
    setStatus(newStatus);
    toast({
      title: "Statut mis à jour",
      description: "Votre statut a été mis à jour avec succès",
    });
  };

  const statusConfig = {
    available: { color: "bg-interpreter-available text-white", label: "Disponible" },
    busy: { color: "bg-interpreter-busy text-white", label: "En appel" },
    pause: { color: "bg-interpreter-pause text-white", label: "En pause" },
    unavailable: { color: "bg-interpreter-unavailable text-white", label: "Indisponible" },
  };

  return (
    <Card className="w-full max-w-2xl p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Mon Profil</h2>
        <Badge className={statusConfig[status].color}>
          {statusConfig[status].label}
        </Badge>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Modifier mon statut</h3>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {Object.entries(statusConfig).map(([key, value]) => (
              <Button
                key={key}
                onClick={() => handleStatusChange(key as Status)}
                variant={status === key ? "default" : "outline"}
                className={status === key ? value.color : ""}
              >
                {value.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};