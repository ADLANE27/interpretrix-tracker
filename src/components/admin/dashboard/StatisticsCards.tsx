
import { CalendarDays, CheckCircle2, Clock, Coffee, Phone, Users, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

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
      delay: 0,
    },
    {
      title: "Missions aujourd'hui",
      value: todayMissionsCount,
      icon: CalendarDays,
      color: "from-purple-400/80 to-purple-600/80",
      delay: 0.1,
    },
    {
      title: "Disponibles",
      value: availableCount,
      icon: CheckCircle2,
      color: "from-green-400/80 to-green-600/80",
      delay: 0.2,
    },
    {
      title: "En appel",
      value: busyCount,
      icon: Phone,
      color: "from-violet-400/80 to-violet-600/80",
      delay: 0.3,
    },
    {
      title: "En pause",
      value: pauseCount,
      icon: Coffee,
      color: "from-orange-400/80 to-orange-600/80",
      delay: 0.4,
    },
    {
      title: "Indisponibles",
      value: unavailableCount,
      icon: X,
      color: "from-red-400/80 to-red-600/80",
      delay: 0.5,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.5,
              delay: card.delay,
              ease: "easeOut"
            }}
          >
            <Card
              className={`glass-card bg-gradient-to-br ${card.color} text-white p-4 shadow-lg hover:shadow-xl transition-all duration-300 h-full`}
            >
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
                  <Icon className="h-8 w-8 opacity-90" />
                </div>
                <span className="text-2xl font-bold">{card.value}</span>
                <span className="text-sm opacity-90">{card.title}</span>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};
