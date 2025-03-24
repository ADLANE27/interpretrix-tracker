
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
      color: "from-palette-ocean-blue to-palette-soft-blue",
      textColor: "text-white",
    },
    {
      title: "Missions aujourd'hui",
      value: todayMissionsCount,
      icon: CalendarDays,
      color: "from-palette-vivid-purple to-palette-soft-purple",
      textColor: "text-white",
    },
    {
      title: "Disponibles",
      value: availableCount,
      icon: CheckCircle2,
      color: "from-green-400 to-emerald-600",
      textColor: "text-white",
    },
    {
      title: "En appel",
      value: busyCount,
      icon: Phone,
      color: "from-indigo-400 to-palette-vivid-purple",
      textColor: "text-white",
    },
    {
      title: "En pause",
      value: pauseCount,
      icon: Coffee,
      color: "from-amber-400 to-palette-bright-orange",
      textColor: "text-white",
    },
    {
      title: "Indisponibles",
      value: unavailableCount,
      icon: X,
      color: "from-red-400 to-rose-600",
      textColor: "text-white",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card
            key={index}
            className={`bg-gradient-to-br ${card.color} ${card.textColor} p-4 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 border-0`}
          >
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
                <Icon className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold">{card.value}</span>
              <span className="text-xs opacity-90">{card.title}</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
