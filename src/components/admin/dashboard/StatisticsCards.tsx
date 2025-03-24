
import { Clock, RefreshCw, Coffee, X, Phone, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface StatisticsCardsProps {
  totalInterpreters: number;
  availableCount: number;
  busyCount: number;
  pauseCount: number;
  unavailableCount: number;
  todayMissionsCount: number;
  isDataStale?: boolean;
  onRefresh?: () => void;
}

export const StatisticsCards = ({
  totalInterpreters,
  availableCount,
  busyCount,
  pauseCount,
  unavailableCount,
  todayMissionsCount,
  isDataStale = false,
  onRefresh
}: StatisticsCardsProps) => {
  const stats = [
    {
      title: "Disponibles",
      value: availableCount,
      icon: Clock,
      color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      iconColor: "text-green-600 dark:text-green-400",
      percent: totalInterpreters > 0 ? Math.round((availableCount / totalInterpreters) * 100) : 0
    },
    {
      title: "En appel",
      value: busyCount,
      icon: Phone,
      color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
      iconColor: "text-violet-600 dark:text-violet-400",
      percent: totalInterpreters > 0 ? Math.round((busyCount / totalInterpreters) * 100) : 0
    },
    {
      title: "En pause",
      value: pauseCount,
      icon: Coffee,
      color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      iconColor: "text-orange-600 dark:text-orange-400",
      percent: totalInterpreters > 0 ? Math.round((pauseCount / totalInterpreters) * 100) : 0
    },
    {
      title: "Indisponibles",
      value: unavailableCount,
      icon: X,
      color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      iconColor: "text-red-600 dark:text-red-400",
      percent: totalInterpreters > 0 ? Math.round((unavailableCount / totalInterpreters) * 100) : 0
    },
    {
      title: "Missions du jour",
      value: todayMissionsCount,
      icon: Calendar,
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      iconColor: "text-blue-600 dark:text-blue-400",
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Tableau de bord</h2>
        {isDataStale && onRefresh && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onRefresh}
            className="flex items-center gap-1 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Actualiser</span>
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map(stat => (
          <Card key={stat.title}>
            <CardContent className="p-4 flex flex-col md:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                {stat.percent !== undefined && (
                  <span className="text-xs font-medium text-muted-foreground">{stat.percent}%</span>
                )}
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
              <h3 className="text-2xl font-bold">{stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
