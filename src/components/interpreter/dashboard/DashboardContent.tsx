
import { motion, AnimatePresence } from "framer-motion";
import { MissionsTab } from "../MissionsTab";
import { MessagingTab } from "../MessagingTab";
import { InterpreterProfile } from "../InterpreterProfile";
import { MissionsCalendar } from "../MissionsCalendar";
import { Profile } from "@/types/profile";
import { useIsMobile } from "@/hooks/use-mobile";

interface DashboardContentProps {
  activeTab: string;
  profile: Profile | null;
  scheduledMissions: any[];
  onProfileUpdate: () => Promise<void>;
  onProfilePictureUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onProfilePictureDelete: () => Promise<void>;
  onStatusChange?: (newStatus: Profile['status']) => Promise<void>;
  onMenuClick?: () => void;
}

export const DashboardContent = ({
  activeTab,
  profile,
  scheduledMissions,
  onProfileUpdate,
  onProfilePictureUpload,
  onProfilePictureDelete,
  onStatusChange,
  onMenuClick
}: DashboardContentProps) => {
  const isMobile = useIsMobile();

  const renderActiveTab = () => {
    switch (activeTab) {
      case "missions":
        return <MissionsTab />;
      case "messages":
        return <MessagingTab profile={profile} onStatusChange={onStatusChange} onMenuClick={onMenuClick} />;
      case "profile":
        return (
          <InterpreterProfile 
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onProfilePictureUpload={onProfilePictureUpload}
            onProfilePictureDelete={onProfilePictureDelete}
          />
        );
      case "calendar":
        return <MissionsCalendar missions={scheduledMissions} />;
      default:
        return <MissionsTab />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-br from-white via-palette-soft-blue/20 to-palette-soft-purple/30 dark:from-gray-900 dark:via-palette-ocean-blue/10 dark:to-palette-vivid-purple/10">
      <div className="container mx-auto p-0 flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 20 }}
            className="w-full h-full flex flex-col"
          >
            <div className={`
              ${isMobile ? 'p-2 sm:p-3 pb-16' : 'p-4 md:p-6'} 
              flex-1 overflow-hidden
              rounded-xl
            `}>
              {renderActiveTab()}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
