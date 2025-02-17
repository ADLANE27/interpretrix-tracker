
import { useEffect, useState } from "react";
import { AddressSection } from "./profile/AddressSection";
import { PersonalInfoSection } from "./profile/PersonalInfoSection";
import { ProfessionalInfoSection } from "./profile/ProfessionalInfoSection";
import { ThemeToggle } from "./ThemeToggle";
import { supabase } from "@/integrations/supabase/client";

export function ProfileTab() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('interpreter_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(data);
    };

    fetchProfile();
  }, []);

  if (!profile) {
    return <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
    </div>;
  }

  return (
    <div className="space-y-8">
      <PersonalInfoSection profile={profile} />
      <AddressSection profile={profile} />
      <ProfessionalInfoSection profile={profile} />
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
    </div>
  );
}
