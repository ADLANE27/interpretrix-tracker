
import { motion, AnimatePresence } from "framer-motion";
import { MissionsTab } from "../MissionsTab";
import { MessagingTab } from "../MessagingTab";
import { InterpreterProfile } from "../InterpreterProfile";
import { MissionsCalendar } from "../MissionsCalendar";
import { TerminologyTab } from "../TerminologyTab";
import { NotesTab } from "../NotesTab";
import { Profile } from "@/types/profile";
import { useIsMobile } from "@/hooks/use-mobile";

interface DashboardContentProps {
  activeTab: string;
  profile: Profile | null;
  scheduledMissions: any[];
  onProfileUpdate: () => Promise<void>;
  onProfilePictureUpload?: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onProfilePictureDelete?: () => Promise<void>;
  onStatusChange?: (newStatus: Profile['status']) => Promise<void>;
  onMenuClick?: () => void;
  onMissionsUpdate?: () => Promise<void>;
}

export const DashboardContent = ({
  activeTab,
  profile,
  scheduledMissions,
  onProfileUpdate,
  onProfilePictureUpload,
  onProfilePictureDelete,
  onStatusChange,
  onMenuClick,
  onMissionsUpdate
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
      case "terminology":
        return <TerminologyTab userId={profile?.id} />;
      case "notes":
        return <NotesTab />;
      default:
        return <MissionsTab />;
    }
  };

  return (
    <div className="flex-1 overflow-auto h-full pb-16">
      <div className="container mx-auto p-0 h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-full h-full"
          >
            <div className={`
              ${isMobile ? 'p-2 sm:p-3' : 'p-4 md:p-6'} 
              h-full overflow-auto
              bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/70
              backdrop-blur-sm rounded-md shadow-sm
            `}>
              {renderActiveTab()}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
