
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Home, Building } from "lucide-react";
import { UpcomingMissionBadge } from "@/components/UpcomingMissionBadge";
import { EmploymentStatus, employmentStatusLabels } from "@/utils/employmentStatus";
import { Profile } from "@/types/profile";
import { WorkLocation, workLocationLabels } from "@/utils/workLocationStatus";
import { InterpreterStatusDropdown } from "./InterpreterStatusDropdown";
import { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface InterpreterListItemProps {
  interpreter: {
    id: string;
    name: string;
    status: Profile['status'];
    employment_status: EmploymentStatus;
    languages: string[];
    next_mission_start?: string | null;
    next_mission_duration?: number | null;
    work_location?: WorkLocation;
  };
  onStatusChange?: (interpreterId: string, newStatus: Profile['status']) => void;
}

const workLocationConfig = {
  remote: {
    color: "bg-purple-100 text-purple-800 border border-purple-300",
    icon: Home
  },
  on_site: {
    color: "bg-blue-100 text-blue-800 border border-blue-300",
    icon: Building
  }
};

export const InterpreterListItem = ({ interpreter, onStatusChange }: InterpreterListItemProps) => {
  // Set default status to "unavailable" if not valid
  const validStatus: Profile['status'] = 
    ["available", "unavailable", "pause", "busy"].includes(interpreter.status) 
      ? interpreter.status 
      : "unavailable";
      
  const [interpreterStatus, setInterpreterStatus] = useState<Profile['status']>(validStatus);
  const { toast } = useToast();
  const statusRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastStatusUpdateRef = useRef<number>(0);

  // Refresh interpreter status from the database when UI becomes stale
  const refreshInterpreterStatus = async () => {
    try {
      // Only refresh if it's been at least 5 seconds since the last update
      const now = Date.now();
      if (now - lastStatusUpdateRef.current < 5000) {
        console.log(`[InterpreterListItem] Skipping refresh for ${interpreter.id} - too recent`);
        return;
      }
      
      console.log(`[InterpreterListItem] Refreshing status for ${interpreter.id} from database`);
      
      const { data, error } = await supabase
        .from('interpreter_profiles')
        .select('status')
        .eq('id', interpreter.id)
        .single();
        
      if (error) {
        console.error(`[InterpreterListItem] Error refreshing status for ${interpreter.id}:`, error);
        return;
      }
      
      if (data && data.status && data.status !== interpreterStatus) {
        console.log(`[InterpreterListItem] Status updated from database for ${interpreter.id}: ${data.status}`);
        setInterpreterStatus(data.status as Profile['status']);
        lastStatusUpdateRef.current = now;
      }
    } catch (error) {
      console.error(`[InterpreterListItem] Exception refreshing status for ${interpreter.id}:`, error);
    }
  };

  // Log initial status for debugging
  useEffect(() => {
    console.log(`[InterpreterListItem] Initial status for ${interpreter.id}:`, validStatus);
    
    // Set up a periodic refresh of the status
    statusRefreshTimeoutRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshInterpreterStatus();
      }
    }, 30000); // Every 30 seconds
    
    return () => {
      if (statusRefreshTimeoutRef.current) {
        clearInterval(statusRefreshTimeoutRef.current);
      }
    };
  }, [interpreter.id, validStatus]);

  // Update local state when props change
  useEffect(() => {
    if (interpreter.status !== interpreterStatus && ["available", "unavailable", "pause", "busy"].includes(interpreter.status)) {
      console.log(`[InterpreterListItem] Status updated from props for ${interpreter.id}:`, interpreter.status);
      setInterpreterStatus(interpreter.status);
      lastStatusUpdateRef.current = Date.now();
    }
  }, [interpreter.status, interpreter.id, interpreterStatus]);

  // Listen for global status update events
  useEffect(() => {
    const handleStatusUpdate = () => {
      console.log(`[InterpreterListItem] Received status update event for ${interpreter.id}`);
      refreshInterpreterStatus();
    };
    
    window.addEventListener('interpreter-status-update', handleStatusUpdate);
    
    return () => {
      window.removeEventListener('interpreter-status-update', handleStatusUpdate);
    };
  }, [interpreter.id]);

  const handleStatusChange = (newStatus: Profile['status']) => {
    console.log(`[InterpreterListItem] Status change requested for ${interpreter.id}:`, newStatus);
    setInterpreterStatus(newStatus);
    lastStatusUpdateRef.current = Date.now();
    
    if (onStatusChange) {
      onStatusChange(interpreter.id, newStatus);
    }
  };

  const parsedLanguages = interpreter.languages
    .map(lang => {
      const [source, target] = lang.split('→').map(l => l.trim());
      return { source, target };
    })
    .filter(lang => lang.source && lang.target);

  const workLocation = interpreter.work_location || "on_site";
  const LocationIcon = workLocationConfig[workLocation].icon;

  return (
    <Card className="p-4 hover-elevate gradient-border">
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <InterpreterStatusDropdown 
              interpreterId={interpreter.id}
              currentStatus={interpreterStatus}
              displayFormat="badge"
              onStatusChange={handleStatusChange}
            />
            <span className="font-medium truncate text-gradient-primary">{interpreter.name}</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap flex-1 justify-end">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-palette-ocean-blue" />
              <div className="flex flex-wrap gap-1">
                {parsedLanguages.map((lang, index) => (
                  <div
                    key={index}
                    className="px-3 py-1 bg-gradient-to-r from-palette-soft-blue to-palette-soft-purple text-slate-700 rounded-lg text-sm flex items-center gap-1 shadow-sm"
                  >
                    <span>{lang.source}</span>
                    <span className="text-palette-vivid-purple">→</span>
                    <span>{lang.target}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-sm text-white font-medium bg-gradient-to-r from-palette-vivid-purple to-indigo-500 px-3 py-1 rounded-full shadow-sm">
              {employmentStatusLabels[interpreter.employment_status]}
            </div>

            <div className={`px-3 py-1 rounded-full text-xs flex items-center gap-1 ${workLocationConfig[workLocation].color}`}>
              <LocationIcon className="h-3 w-3" />
              <span>{workLocationLabels[workLocation]}</span>
            </div>

            {interpreter.next_mission_start && (
              <UpcomingMissionBadge
                startTime={interpreter.next_mission_start}
                estimatedDuration={interpreter.next_mission_duration || 0}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
