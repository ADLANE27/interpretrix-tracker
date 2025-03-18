
import { CalendarDays, CheckCircle2, Clock, Coffee, Phone, Users, X } from "lucide-react";

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
      color: "from-blue-400/80 to-blue-600/80",
    },
    {
      title: "Missions aujourd'hui",
      value: todayMissionsCount,
      icon: CalendarDays,
      color: "from-purple-400/80 to-purple-600/80",
    },
    {
      title: "Disponibles",
      value: availableCount,
      icon: CheckCircle2,
      color: "from-green-400/80 to-green-600/80",
    },
    {
      title: "En appel",
      value: busyCount,
      icon: Phone,
      color: "from-violet-400/80 to-violet-600/80",
    },
    {
      title: "En pause",
      value: pauseCount,
      icon: Coffee,
      color: "from-orange-400/80 to-orange-600/80",
    },
    {
      title: "Indisponibles",
      value: unavailableCount,
      icon: X,
      color: "from-red-400/80 to-red-600/80",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div 
            key={index}
            className="glass-card rounded-xl p-4 purple-glow transition-all duration-300 hover:scale-102"
          >
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">{card.value}</span>
              <span className="text-sm text-white/70">{card.title}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
