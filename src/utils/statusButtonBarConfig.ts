
import { Clock, Coffee, X, Phone } from 'lucide-react';
import { Profile } from "@/types/profile";

export type Status = Profile['status'];

export interface StatusConfig {
  color: string;
  shadowColor: string;
  label: string;
  mobileLabel: string;
  icon: React.ComponentType;
}

export const statusButtonBarConfig: Record<Status, StatusConfig> = {
  available: {
    color: "from-green-400 to-green-600",
    shadowColor: "shadow-green-500/20",
    label: "Disponible",
    mobileLabel: "Dispo",
    icon: Clock
  },
  busy: {
    color: "from-violet-400 to-violet-600",
    shadowColor: "shadow-violet-500/20",
    label: "En appel",
    mobileLabel: "Appel",
    icon: Phone
  },
  pause: {
    color: "from-orange-400 to-orange-600",
    shadowColor: "shadow-orange-500/20",
    label: "En pause",
    mobileLabel: "Pause",
    icon: Coffee
  },
  unavailable: {
    color: "from-red-400 to-red-600",
    shadowColor: "shadow-red-500/20",
    label: "Indisponible",
    mobileLabel: "Indispo",
    icon: X
  }
};
