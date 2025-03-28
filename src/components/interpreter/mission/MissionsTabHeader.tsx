
import { Badge } from "@/components/ui/badge";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Box, CalendarClock, Clock, Inbox } from "lucide-react";

interface MissionsTabHeaderProps {
  activeTab: string;
  missionsCount: number;
  pendingCount: number;
  upcomingCount: number;
  incomingCount: number;
}

export const MissionsTabHeader = ({
  activeTab,
  missionsCount,
  pendingCount,
  upcomingCount,
  incomingCount
}: MissionsTabHeaderProps) => {
  return (
    <TabsList className="grid grid-cols-4 mb-4">
      <TabsTrigger value="all">
        Toutes
        {missionsCount > 0 && (
          <Badge variant="secondary" className="ml-2">{missionsCount}</Badge>
        )}
      </TabsTrigger>
      
      <TabsTrigger value="pending">
        <div className="flex items-center gap-1">
          <Inbox className="h-4 w-4" />
          <span>En attente</span>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="ml-1">{pendingCount}</Badge>
          )}
        </div>
      </TabsTrigger>
      
      <TabsTrigger value="upcoming">
        <div className="flex items-center gap-1">
          <CalendarClock className="h-4 w-4" />
          <span>À venir</span>
          {upcomingCount > 0 && (
            <Badge variant="default" className="ml-1">{upcomingCount}</Badge>
          )}
        </div>
      </TabsTrigger>
      
      <TabsTrigger value="incoming">
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>Immédiates</span>
          {incomingCount > 0 && (
            <Badge variant="default" className="ml-1">{incomingCount}</Badge>
          )}
        </div>
      </TabsTrigger>
    </TabsList>
  );
};
