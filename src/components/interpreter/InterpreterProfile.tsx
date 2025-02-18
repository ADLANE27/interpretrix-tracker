import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PersonalInfoSection } from "./profile/PersonalInfoSection";
import { AddressSection } from "./profile/AddressSection";
import { ProfessionalInfoSection } from "./profile/ProfessionalInfoSection";

type EmploymentStatus = "salaried_aft" | "salaried_aftcom" | "salaried_planet" | "self_employed" | "permanent_interpreter";

interface Address {
  street: string;
  postal_code: string;
  city: string;
}

interface LanguagePair {
  source: string;
  target: string;
}

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
  tarif_15min: number;
}

export const InterpreterProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("[InterpreterProfile] No authenticated user found");
        return;
      }

      console.log("[InterpreterProfile] Checking admin status for user:", user.id);
      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleError) {
        console.error("[InterpreterProfile] Error fetching user role:", roleError);
        return;
      }

      console.log("[InterpreterProfile] User role data:", userRole);
      setIsAdmin(userRole?.role === 'admin');
    } catch (error) {
      console.error('[InterpreterProfile] Error checking admin status:', error);
    }
  };

  const createProfile = async (userId: string, userEmail: string) => {
    console.log("[InterpreterProfile] Creating new profile for user:", userId);
    
    const { data, error } = await supabase
      .from("interpreter_profiles")
      .insert({
        id: userId,
        first_name: '',
        last_name: '',
        email: userEmail,
        employment_status: 'salaried_aft',
        languages: [],
      })
      .select()
      .single();

    if (error) {
      console.error("[InterpreterProfile] Error creating profile:", error);
      throw error;
    }

    console.log("[InterpreterProfile] Profile created successfully:", data);
    return data;
  };

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("[InterpreterProfile] No authenticated user found");
        toast({
          title: "Non authentifié",
          description: "Veuillez vous connecter pour accéder à votre profil",
          variant: "destructive",
        });
        return;
      }

      console.log("[InterpreterProfile] Fetching profile for user:", user.id);
      
      let { data, error } = await supabase
        .from("interpreter_profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("[InterpreterProfile] Error fetching profile:", error);
        throw error;
      }

      if (!data) {
        console.log("[InterpreterProfile] No profile found, creating one");
        try {
          data = await createProfile(user.id, user.email || '');
        } catch (createError) {
          console.error("[InterpreterProfile] Error creating profile:", createError);
          toast({
            title: "Erreur",
            description: "Impossible de créer votre profil",
            variant: "destructive",
          });
          return;
        }
      }

      console.log("[InterpreterProfile] Profile data:", data);

      // Transform language strings to LanguagePair objects
      const languagePairs: LanguagePair[] = (data.languages || []).map((lang: string) => {
        const [source, target] = lang.split(" → ");
        return { source, target };
      });

      // Safely transform the address from JSON
      const addressData = data.address as { street: string; postal_code: string; city: string; } | null;
      const transformedAddress: Address | null = addressData ? {
        street: addressData.street || "",
        postal_code: addressData.postal_code || "",
        city: addressData.city || "",
      } : null;

      const transformedProfile: Profile = {
        id: data.id,
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone_number: data.phone_number,
        landline_phone: data.landline_phone,
        address: transformedAddress,
        nationality: data.nationality,
        employment_status: data.employment_status,
        languages: languagePairs,
        tarif_15min: data.tarif_15min || 0,
      };

      setProfile(transformedProfile);
    } catch (error) {
      console.error("[InterpreterProfile] Error in profile flow:", error);
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

      // Transform Address to a plain object for JSON storage
      const addressForStorage = profile.address ? {
        street: profile.address.street,
        postal_code: profile.address.postal_code,
        city: profile.address.city,
      } : null;

      const { error } = await supabase
        .from("interpreter_profiles")
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          phone_number: profile.phone_number,
          landline_phone: profile.landline_phone,
          address: addressForStorage,
          nationality: profile.nationality,
          employment_status: profile.employment_status,
          languages: languageStrings,
          ...(isAdmin && { tarif_15min: profile.tarif_15min }),
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
          rate15min={profile.tarif_15min}
          isEditing={isEditing}
          isAdmin={isAdmin}
          onChange={(field, value) => {
            if (field === "rate15min" && typeof value === "number") {
              setProfile({
                ...profile,
                tarif_15min: value,
              });
            } else if (typeof value === "string") {
              setProfile({
                ...profile,
                [field]: value,
              });
            }
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
