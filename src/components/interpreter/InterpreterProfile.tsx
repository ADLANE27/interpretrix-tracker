import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { CountrySelect } from "../CountrySelect";
import { LanguageSelector, LanguagePair } from "./LanguageSelector";
import { Json } from "@/integrations/supabase/types";

interface Address {
  street: string;
  postal_code: string;
  city: string;
}

type Status = "available" | "busy" | "pause" | "unavailable";
type EmploymentStatus = "salaried" | "self_employed";

interface InterpreterProfile {
  id: string;
  first_name: string;
  last_name: string;
  address: Address | null;
  employment_status: EmploymentStatus;
  phone_number: string | null;
  email: string;
  languages: string[];
  phone_interpretation_rate: number | null;
  siret_number: string | null;
  vat_number: string | null;
  status: Status;
  created_at?: string;
  updated_at?: string;
  specializations: string[];
  birth_country: string | null;
  nationality: string | null;
}

export const InterpreterProfile = () => {
  const [profile, setProfile] = useState<InterpreterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const statusConfig = {
    available: { color: "bg-interpreter-available text-white", label: "Disponible" },
    busy: { color: "bg-interpreter-busy text-white", label: "En appel" },
    pause: { color: "bg-interpreter-pause text-white", label: "En pause" },
    unavailable: { color: "bg-interpreter-unavailable text-white", label: "Indisponible" },
  };

  const handleLanguagesChange = (newLanguagePairs: LanguagePair[]) => {
    if (!profile) return;
    
    // Convert LanguagePair objects to strings in the format "source → target"
    const languageStrings = newLanguagePairs.map(pair => `${pair.source} → ${pair.target}`);
    
    setProfile({
      ...profile,
      languages: languageStrings
    });
  };

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
      
      // Safely cast the address data
      const addressData = data.address as { [key: string]: string } | null;
      const address: Address | null = addressData ? {
        street: addressData.street || '',
        postal_code: addressData.postal_code || '',
        city: addressData.city || ''
      } : null;
      
      // Convert language strings to LanguagePair objects for the selector
      const profileData: InterpreterProfile = {
        ...data,
        status: (data.status || 'available') as Status,
        address,
        languages: data.languages || [],
        specializations: data.specializations || []
      };
      
      setProfile(profileData);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger votre profil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      // Convert Address to Json type for Supabase
      const addressJson: Json | null = profile.address ? {
        street: profile.address.street,
        postal_code: profile.address.postal_code,
        city: profile.address.city
      } : null;

      const { error } = await supabase
        .from("interpreter_profiles")
        .update({
          ...profile,
          address: addressJson,
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

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (!profile) {
    return <div>Profil non trouvé</div>;
  }

  // Convert language strings back to LanguagePair objects for the selector
  const languagePairs: LanguagePair[] = profile.languages.map(lang => {
    const [source, target] = lang.split(" → ");
    return { source, target };
  });

  return (
    <Card className="w-full max-w-4xl p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Mon Profil</h2>
        <div className="flex items-center gap-2">
          <Badge className={statusConfig[profile.status].color}>
            {statusConfig[profile.status].label}
          </Badge>
          <Button 
            variant="outline" 
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? "Annuler" : "Modifier"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleProfileUpdate} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">Prénom</Label>
            <Input
              id="first_name"
              value={profile.first_name}
              onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
              disabled={!isEditing}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name">Nom</Label>
            <Input
              id="last_name"
              value={profile.last_name}
              onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
              disabled={!isEditing}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              disabled={!isEditing}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone_number">Numéro de téléphone</Label>
            <Input
              id="phone_number"
              value={profile.phone_number || ""}
              onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="employment_status">Statut professionnel</Label>
            <Select
              value={profile.employment_status}
              onValueChange={(value: EmploymentStatus) => 
                isEditing && setProfile({ ...profile, employment_status: value })
              }
              disabled={!isEditing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez votre statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="salaried">Salarié</SelectItem>
                <SelectItem value="self_employed">Auto-entrepreneur</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 col-span-2">
            <Label>Langues de travail</Label>
            <LanguageSelector
              languages={languagePairs}
              onChange={handleLanguagesChange}
              isEditing={isEditing}
            />
          </div>

          <div className="space-y-2 col-span-2">
            <Label>Adresse</Label>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="street">Rue</Label>
                <Input
                  id="street"
                  value={profile.address?.street || ""}
                  onChange={(e) => setProfile({
                    ...profile,
                    address: {
                      ...(profile.address || { street: "", postal_code: "", city: "" }),
                      street: e.target.value
                    }
                  })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">Code postal</Label>
                <Input
                  id="postal_code"
                  value={profile.address?.postal_code || ""}
                  onChange={(e) => setProfile({
                    ...profile,
                    address: {
                      ...(profile.address || { street: "", postal_code: "", city: "" }),
                      postal_code: e.target.value
                    }
                  })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  value={profile.address?.city || ""}
                  onChange={(e) => setProfile({
                    ...profile,
                    address: {
                      ...(profile.address || { street: "", postal_code: "", city: "" }),
                      city: e.target.value
                    }
                  })}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="birth_country">Pays de naissance</Label>
            <CountrySelect
              value={profile.birth_country || ""}
              onValueChange={(value) => setProfile({ ...profile, birth_country: value })}
              label="Pays de naissance"
              placeholder="Sélectionner votre pays de naissance"
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nationality">Nationalité</Label>
            <Input
              id="nationality"
              value={profile.nationality || ""}
              onChange={(e) => setProfile({ ...profile, nationality: e.target.value })}
              disabled={!isEditing}
            />
          </div>

          {isEditing && (
            <Button type="submit" className="w-full">
              Enregistrer les modifications
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
};
