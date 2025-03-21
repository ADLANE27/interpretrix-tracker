
import { type Profile } from "@/types/profile";

export interface ProfileHeaderProps {
  profile: Profile;
}

export const ProfileHeader = ({ profile }: ProfileHeaderProps) => {
  return (
    <div className="flex items-center gap-2">
      <span className="font-medium">
        {profile.first_name} {profile.last_name}
      </span>
    </div>
  );
};
