
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
      color: "from-blue-400 to-blue-600",
    },
    {
      title: "Missions aujourd'hui",
      value: todayMissionsCount,
      icon: CalendarDays,
      color: "from-purple-400 to-purple-600",
    },
    {
      title: "Disponibles",
      value: availableCount,
      icon: CheckCircle2,
      color: "from-green-400 to-green-600",
    },
    {
      title: "En appel",
      value: busyCount,
      icon: Phone,
      color: "from-violet-400 to-violet-600",
    },
    {
      title: "En pause",
      value: pauseCount,
      icon: Coffee,
      color: "from-orange-400 to-orange-600",
    },
    {
      title: "Indisponibles",
      value: unavailableCount,
      icon: X,
      color: "from-red-400 to-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card
            key={index}
            className={`bg-gradient-to-br ${card.color} text-white p-3 shadow-lg hover:shadow-xl transition-shadow`}
          >
            <div className="flex flex-col items-center justify-center space-y-1">
              <Icon className="h-6 w-6 opacity-80" />
              <span className="text-xl font-bold">{card.value}</span>
              <span className="text-xs opacity-80">{card.title}</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
