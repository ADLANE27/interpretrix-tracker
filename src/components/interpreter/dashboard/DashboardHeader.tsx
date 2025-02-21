
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "../ThemeToggle";
import { StatusManager } from "../StatusManager";
import { Profile } from "@/types/profile";

interface DashboardHeaderProps {
  profile: Profile | null;
  onStatusChange: (newStatus: Profile['status']) => Promise<void>;
}

export const DashboardHeader = ({ profile, onStatusChange }: DashboardHeaderProps) => {
  return (
    <header className="h-16 border-b bg-white dark:bg-gray-800 flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <StatusManager
          currentStatus={profile?.status}
          onStatusChange={onStatusChange}
        />
      </div>
      
      <div className="flex items-center gap-3">
        <ThemeToggle />
      </div>
    </header>
  );
};
