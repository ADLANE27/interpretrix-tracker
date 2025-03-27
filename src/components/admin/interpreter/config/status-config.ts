
import { Clock, Coffee, X, Phone } from "lucide-react";
import { Status, StatusConfigItem } from "../types/status-types";

export const statusConfig: Record<Status, StatusConfigItem> = {
  available: {
    color: "bg-green-100 text-green-800",
    label: "Disponible",
    mobileLabel: "Dispo",
    icon: Clock
  },
  busy: {
    color: "bg-violet-100 text-violet-800",
    label: "En appel",
    mobileLabel: "Appel",
    icon: Phone
  },
  pause: {
    color: "bg-orange-100 text-orange-800",
    label: "En pause",
    mobileLabel: "Pause",
    icon: Coffee
  },
  unavailable: {
    color: "bg-red-100 text-red-800",
    label: "Indisponible",
    mobileLabel: "Indispo",
    icon: X
  }
};
