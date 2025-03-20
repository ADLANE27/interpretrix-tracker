
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { MissionsTab } from "../MissionsTab";
import { MessagingTab } from "../MessagingTab";
import { InterpreterProfile } from "../InterpreterProfile";
import { MissionsCalendar } from "../MissionsCalendar";
import { TerminologyTab } from "../TerminologyTab";
import { Profile } from "@/types/profile";

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
      default:
        return <MissionsTab />;
    }
  };

  return (
    <div className="flex-1 overflow-auto h-full">
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
            <Card className="shadow-sm border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm h-full rounded-none sm:border sm:rounded-xl">
              <div className="p-3 sm:p-4 md:p-6 h-full overflow-auto">
                {renderActiveTab()}
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
