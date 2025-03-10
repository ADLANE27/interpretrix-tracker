import { useEffect, useState } from "react";
import { AddressSection } from "./profile/AddressSection";
import { PersonalInfoSection } from "./profile/PersonalInfoSection";
import { ProfessionalInfoSection } from "./profile/ProfessionalInfoSection";
import { ThemeToggle } from "./ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { EmploymentStatus } from "@/types/employment";

interface ExtendedProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  landline_phone: string | null;
  nationality: string | null;
  employment_status: EmploymentStatus;
  languages: { source: string; target: string; }[];
  address: {
    street: string;
    postal_code: string;
    city: string;
  } | null;
  tarif_15min: number;
  tarif_5min: number;
  phone_interpretation_rate: number;
  siret_number: string;
  vat_number: string;
}

export const ProfileTab = () => {
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

        const formattedAddress = data.address ? {
          street: (data.address as any).street || '',
          postal_code: (data.address as any).postal_code || '',
          city: (data.address as any).city || ''
        } : null;

        const formattedProfile: ExtendedProfile = {
          id: data.id,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone_number: data.phone_number,
          landline_phone: data.landline_phone,
          nationality: data.nationality,
          employment_status: data.employment_status,
          languages: languagePairs,
          address: formattedAddress,
          tarif_15min: data.tarif_15min,
          tarif_5min: data.tarif_5min,
          phone_interpretation_rate: data.phone_interpretation_rate || 0,
          siret_number: data.siret_number || '',
          vat_number: data.vat_number || ''
        };

        setProfile(formattedProfile);
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
    <div className="space-y-6">
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

      <ProfessionalInfoSection
        employmentStatus={profile.employment_status}
        onEmploymentStatusChange={() => {}}
        languages={profile.languages}
        onLanguagesChange={() => {}}
        tarif5min={profile.tarif_5min}
        onTarif5minChange={() => {}}
        tarif15min={profile.tarif_15min}
        onTarif15minChange={() => {}}
        phoneInterpretationRate={profile.phone_interpretation_rate || 0}
        onPhoneInterpretationRateChange={() => {}}
        siretNumber={profile.siret_number || ''}
        onSiretNumberChange={() => {}}
        vatNumber={profile.vat_number || ''}
        onVatNumberChange={() => {}}
        isEditing={false}
      />

      <AddressSection
        address={profile.address}
        isEditing={false}
        onChange={() => {}}
      />
    </div>
  );
};
