
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { MissionsTab } from "../MissionsTab";
import { MessagingTab } from "../MessagingTab";
import { InterpreterProfile } from "../InterpreterProfile";
import { MissionsCalendar } from "../MissionsCalendar";
import { Profile } from "@/types/profile";

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
    <div className="flex-1 overflow-hidden h-[calc(100vh-4rem)] w-full">
      <div className="h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full"
          >
            <Card className="shadow-none border-0 bg-background h-full w-full">
              {renderActiveTab()}
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
