
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
      color: "bg-gradient-to-br from-palette-ocean-blue to-palette-bright-orange/30",
      iconBg: "bg-white/15",
      textColor: "text-white",
    },
    {
      title: "Missions aujourd'hui",
      value: todayMissionsCount,
      icon: CalendarDays,
      color: "bg-gradient-to-br from-palette-magenta-pink to-palette-vivid-purple/30",
      iconBg: "bg-white/15",
      textColor: "text-white",
    },
    {
      title: "Disponibles",
      value: availableCount,
      icon: CheckCircle2,
      color: "bg-gradient-to-br from-green-400 to-emerald-600/30",
      iconBg: "bg-white/15",
      textColor: "text-white",
    },
    {
      title: "En appel",
      value: busyCount,
      icon: Phone,
      color: "bg-gradient-to-br from-palette-vivid-purple to-indigo-600/30",
      iconBg: "bg-white/15",
      textColor: "text-white",
    },
    {
      title: "En pause",
      value: pauseCount,
      icon: Coffee,
      color: "bg-gradient-to-br from-palette-bright-orange to-amber-600/30",
      iconBg: "bg-white/15",
      textColor: "text-white",
    },
    {
      title: "Indisponibles",
      value: unavailableCount,
      icon: X,
      color: "bg-gradient-to-br from-red-400 to-rose-600/30",
      iconBg: "bg-white/15",
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
            className={`group relative overflow-hidden ${card.color} p-4 
              border border-white/10 shadow-lg hover:shadow-xl transition-all duration-300
              hover:-translate-y-1`}
          >
            {/* Enhanced contrast for readability */}
            <div className="relative flex flex-col items-center justify-center space-y-2">
              <div className={`p-2 rounded-full ${card.iconBg} backdrop-blur-sm`}>
                <Icon className="h-7 w-7 text-white" />
              </div>
              
              {/* Value with enhanced visibility */}
              <div className="flex flex-col items-center">
                <span className={`text-3xl font-bold mt-1 ${card.textColor} drop-shadow-md`}>
                  {card.value}
                </span>
                
                {/* Title with background for better readability */}
                <span className={`text-sm ${card.textColor} font-medium px-2 py-0.5 rounded-full bg-black/20 backdrop-blur-sm mt-1`}>
                  {card.title}
                </span>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
