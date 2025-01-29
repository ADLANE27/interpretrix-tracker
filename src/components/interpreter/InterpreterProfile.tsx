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
  landline_phone: string | null;
  address: Address | null;
  nationality: string | null;
  employment_status: EmploymentStatus;
  languages: LanguagePair[];
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
        landline_phone: data.landline_phone,
        address: data.address,
        nationality: data.nationality,
        employment_status: data.employment_status,
        languages: languagePairs,
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
          landline_phone: profile.landline_phone,
          address: profile.address,
          nationality: profile.nationality,
          employment_status: profile.employment_status,
          languages: languageStrings,
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
          mobilePhone={profile.phone_number}
          landlinePhone={profile.landline_phone}
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
        />
      </div>
    </Card>
  );
};