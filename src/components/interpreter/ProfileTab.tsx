
import { useEffect, useState } from "react";
import { AddressSection } from "./profile/AddressSection";
import { PersonalInfoSection } from "./profile/PersonalInfoSection";
import { ProfessionalInfoSection } from "./profile/ProfessionalInfoSection";
import { ThemeToggle } from "./ThemeToggle";
import { supabase } from "@/integrations/supabase/client";

interface ExtendedProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  landline_phone: string | null;
  nationality: string | null;
  employment_status: "salaried_aft" | "salaried_aftcom" | "salaried_planet" | "self_employed" | "permanent_interpreter";
  languages: { source: string; target: string; }[];
  address: {
    street: string;
    postal_code: string;
    city: string;
  } | null;
  tarif_15min: number;
}

export function ProfileTab() {
  const [profile, setProfile] = useState<ExtendedProfile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('interpreter_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        const languagePairs = data.languages.map((lang: string) => {
          const [source, target] = lang.split('→').map(part => part.trim());
          return { source, target };
        });

        setProfile({
          ...data,
          languages: languagePairs
        });
      }
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
      <PersonalInfoSection 
        firstName={profile.first_name}
        lastName={profile.last_name}
        email={profile.email}
        mobilePhone={profile.phone_number}
        landlinePhone={profile.landline_phone}
        nationality={profile.nationality}
        rate15min={profile.tarif_15min}
        isEditing={false}
        onChange={() => {}}
      />
      <AddressSection 
        address={profile.address}
        isEditing={false}
        onChange={() => {}}
      />
      <ProfessionalInfoSection 
        employmentStatus={profile.employment_status}
        languages={profile.languages}
        isEditing={false}
        onEmploymentStatusChange={() => {}}
        onLanguagesChange={() => {}}
      />
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
    </div>
  );
}
