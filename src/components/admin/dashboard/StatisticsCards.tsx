
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
            className={`bg-gradient-to-br ${card.color} text-white p-4 shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden`}
          >
            <div className="absolute inset-0 opacity-20 bg-white/10 backdrop-blur-sm"></div>
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full blur-2xl bg-white"></div>
            </div>
            <div className="flex flex-col items-center justify-center space-y-2 relative z-10">
              <Icon className="h-8 w-8 opacity-90" />
              <span className="text-2xl font-bold">{card.value}</span>
              <span className="text-sm opacity-90">{card.title}</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
