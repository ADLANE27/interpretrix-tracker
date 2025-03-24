
import { Clock, Coffee, X, Phone } from "lucide-react";

export const statusConfig = {
  available: {
    color: "bg-interpreter-available hover:bg-interpreter-available/90",
    label: "Disponible",
    icon: Clock,
    mobileLabel: "Dispo"
  },
  busy: {
    color: "bg-interpreter-busy hover:bg-interpreter-busy/90",
    label: "En appel",
    icon: Phone,
    mobileLabel: "Appel"
  },
  pause: {
    color: "bg-interpreter-pause hover:bg-interpreter-pause/90",
    label: "En pause",
    icon: Coffee,
    mobileLabel: "Pause"
  },
  unavailable: {
    color: "bg-interpreter-unavailable hover:bg-interpreter-unavailable/90",
    label: "Indisponible",
    icon: X,
    mobileLabel: "Indispo"
  }
};
