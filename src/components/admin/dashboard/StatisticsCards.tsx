
import { CalendarDays, CheckCircle2, Clock, Coffee, Phone, Users, X } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StatisticsCardsProps {
  totalInterpreters: number;
  availableCount: number;
  busyCount: number;
  pauseCount: number;
  unavailableCount: number;
  todayMissionsCount: number;
}

export const StatisticsCards = ({
  totalInterpreters,
  availableCount,
  busyCount,
  pauseCount,
  unavailableCount,
  todayMissionsCount
}: StatisticsCardsProps) => {
  const cards = [
    {
      title: "Interprètes",
      value: totalInterpreters,
      icon: Users,
      color: "from-palette-ocean-blue/80 to-palette-bright-orange/40",
      borderGlow: "group-hover:border-palette-ocean-blue/50",
    },
    {
      title: "Missions aujourd'hui",
      value: todayMissionsCount,
      icon: CalendarDays,
      color: "from-palette-magenta-pink/80 to-palette-vivid-purple/40",
      borderGlow: "group-hover:border-palette-magenta-pink/50",
    },
    {
      title: "Disponibles",
      value: availableCount,
      icon: CheckCircle2,
      color: "from-green-400/80 to-emerald-600/40",
      borderGlow: "group-hover:border-green-400/50",
    },
    {
      title: "En appel",
      value: busyCount,
      icon: Phone,
      color: "from-palette-vivid-purple/80 to-indigo-600/40",
      borderGlow: "group-hover:border-palette-vivid-purple/50",
    },
    {
      title: "En pause",
      value: pauseCount,
      icon: Coffee,
      color: "from-palette-bright-orange/80 to-amber-600/40",
      borderGlow: "group-hover:border-palette-bright-orange/50",
    },
    {
      title: "Indisponibles",
      value: unavailableCount,
      icon: X,
      color: "from-red-400/80 to-rose-600/40",
      borderGlow: "group-hover:border-red-400/50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card
            key={index}
            className={`group relative overflow-hidden bg-gradient-to-br ${card.color} text-white p-4 
              border border-white/5 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300
              hover:-translate-y-1 ${card.borderGlow}`}
          >
            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 
              group-hover:opacity-20 transition-opacity duration-500"></div>
            
            <div className="relative flex flex-col items-center justify-center space-y-2">
              <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm">
                <Icon className="h-7 w-7 opacity-90" />
              </div>
              <span className="text-2xl font-bold mt-1">{card.value}</span>
              <span className="text-sm opacity-90">{card.title}</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
