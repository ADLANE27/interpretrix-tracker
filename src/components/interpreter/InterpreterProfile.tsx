import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PersonalInfoSection } from "./profile/PersonalInfoSection";
import { AddressSection } from "./profile/AddressSection";
import { ProfessionalInfoSection } from "./profile/ProfessionalInfoSection";

interface Address {
  street: string;
  postal_code: string;
  city: string;
}

interface LanguagePair {
  source: string;
  target: string;
}

type EmploymentStatus = "salaried" | "self_employed";

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  address: Address | null;
  birth_country: string | null;
  nationality: string | null;
  employment_status: EmploymentStatus;
  languages: LanguagePair[];
  phone_interpretation_rate: number | null;
  siret_number: string | null;
  vat_number: string | null;
}

export const InterpreterProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("interpreter_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      // Transform the address data from Json to Address type
      const addressData = data.address as { [key: string]: string } | null;
      const transformedAddress: Address | null = addressData ? {
        street: addressData.street || "",
        postal_code: addressData.postal_code || "",
        city: addressData.city || ""
      } : null;

      // Transform language strings to LanguagePair objects
      const languagePairs: LanguagePair[] = data.languages.map((lang: string) => {
        const [source, target] = lang.split(" → ");
        return { source, target };
      });

      const transformedProfile: Profile = {
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone_number: data.phone_number,
        address: transformedAddress,
        birth_country: data.birth_country,
        nationality: data.nationality,
        employment_status: data.employment_status,
        languages: languagePairs,
        phone_interpretation_rate: data.phone_interpretation_rate,
        siret_number: data.siret_number,
        vat_number: data.vat_number,
      };

      setProfile(transformedProfile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger votre profil",
        variant: "destructive",
      });
    }
  };

  const handleProfileUpdate = async () => {
    if (!profile) return;

    try {
      // Transform LanguagePair objects back to strings
      const languageStrings = profile.languages.map(pair => 
        `${pair.source} → ${pair.target}`
      );

      const { error } = await supabase
        .from("interpreter_profiles")
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          phone_number: profile.phone_number,
          address: profile.address,
          birth_country: profile.birth_country,
          nationality: profile.nationality,
          employment_status: profile.employment_status,
          languages: languageStrings,
          phone_interpretation_rate: profile.phone_interpretation_rate,
          siret_number: profile.siret_number,
          vat_number: profile.vat_number,
        })
        .eq("id", profile.id);

      if (error) throw error;

      setIsEditing(false);
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été mises à jour avec succès",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour votre profil",
        variant: "destructive",
      });
    }
  };

  if (!profile) {
    return <div>Chargement...</div>;
  }

  return (
    <Card className="w-full max-w-4xl p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Mon Profil</h2>
        <Button 
          onClick={() => isEditing ? handleProfileUpdate() : setIsEditing(true)}
        >
          {isEditing ? "Enregistrer" : "Modifier"}
        </Button>
      </div>

      <div className="space-y-8">
        <PersonalInfoSection
          firstName={profile.first_name}
          lastName={profile.last_name}
          email={profile.email}
          phoneNumber={profile.phone_number}
          birthCountry={profile.birth_country}
          nationality={profile.nationality}
          isEditing={isEditing}
          onChange={(field, value) => {
            setProfile({
              ...profile,
              [field]: value,
            });
          }}
        />

        <AddressSection
          address={profile.address}
          isEditing={isEditing}
          onChange={(newAddress) => {
            setProfile({
              ...profile,
              address: newAddress,
            });
          }}
        />

        <ProfessionalInfoSection
          employmentStatus={profile.employment_status}
          languages={profile.languages}
          phoneInterpretationRate={profile.phone_interpretation_rate}
          siretNumber={profile.siret_number}
          vatNumber={profile.vat_number}
          isEditing={isEditing}
          onEmploymentStatusChange={(status) => {
            setProfile({
              ...profile,
              employment_status: status,
            });
          }}
          onLanguagesChange={(languages) => {
            setProfile({
              ...profile,
              languages,
            });
          }}
          onRateChange={(rate) => {
            setProfile({
              ...profile,
              phone_interpretation_rate: rate,
            });
          }}
          onSiretChange={(siret) => {
            setProfile({
              ...profile,
              siret_number: siret,
            });
          }}
          onVatChange={(vat) => {
            setProfile({
              ...profile,
              vat_number: vat,
            });
          }}
        />
      </div>
    </Card>
  );
};