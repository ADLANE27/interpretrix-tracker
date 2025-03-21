
import { type Profile } from "@/types/profile";

export interface ProfileHeaderProps {
  profile: Profile;
}

export const ProfileHeader = ({ profile }: ProfileHeaderProps) => {
  // Use name if available, otherwise combine first and last name
  const displayName = profile.name || `${profile.first_name} ${profile.last_name}`;
  
  return (
    <div className="flex items-center gap-2">
      <span className="font-medium">
        {displayName}
      </span>
    </div>
  );
};
