
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { MissionsTab } from "./MissionsTab";
import { MessagingTab } from "./MessagingTab";
import { InterpreterProfile } from "./InterpreterProfile";
import { MissionsCalendar } from "./MissionsCalendar";
import type { Profile } from "@/types/interpreter";

interface DashboardContentProps {
  activeTab: string;
  profile: Profile | null;
  scheduledMissions: any[];
  onProfileUpdate: () => Promise<void>;
  onProfilePictureUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onProfilePictureDelete: () => Promise<void>;
}

export const DashboardContent = ({
  activeTab,
  profile,
  scheduledMissions,
  onProfileUpdate,
  onProfilePictureUpload,
  onProfilePictureDelete
}: DashboardContentProps) => {
  const renderActiveTab = () => {
    switch (activeTab) {
      case "missions":
        return <MissionsTab />;
      case "messages":
        return <MessagingTab />;
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
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
        className="w-full"
      >
        <Card className="p-6 shadow-lg backdrop-blur-sm bg-card/80">
          {renderActiveTab()}
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
