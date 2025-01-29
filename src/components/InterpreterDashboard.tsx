import { useState, useEffect, useRef } from "react";
import { UserCog } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { LanguageSelector } from "./interpreter/LanguageSelector";
import { MissionsTab } from "./interpreter/MissionsTab";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface LanguagePair {
  source: string;
  target: string;
}

interface Address {
  street: string;
  postal_code: string;
  city: string;
}

interface Profile {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  languages: LanguagePair[];
  employment_status: "salaried" | "self_employed";
  status: "available" | "busy" | "pause" | "unavailable";
  address: Address | null;
  birth_country: string | null;
  nationality: string | null;
  phone_interpretation_rate: number | null;
  siret_number: string | null;
  vat_number: string | null;
  profile_picture_url: string | null;
}

const statusConfig = {
  available: { color: "bg-interpreter-available text-white", label: "Disponible" },
  busy: { color: "bg-interpreter-busy text-white", label: "En appel" },
  pause: { color: "bg-interpreter-pause text-white", label: "En pause" },
  unavailable: { color: "bg-interpreter-unavailable text-white", label: "Indisponible" },
};

const formatName = (name: string): string => {
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
};

export const InterpreterDashboard = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("interpreter_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      
      const languagePairs = data.languages.map((lang: string) => {
        const [source, target] = lang.split(" → ");
        return { source, target };
      });

      const address = data.address as { street: string; postal_code: string; city: string } | null;
      
      const profileData: Profile = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone_number: data.phone_number,
        languages: languagePairs,
        employment_status: data.employment_status,
        status: (data.status || 'available') as Profile['status'],
        address: address,
        birth_country: data.birth_country,
        nationality: data.nationality,
        phone_interpretation_rate: data.phone_interpretation_rate,
        siret_number: data.siret_number,
        vat_number: data.vat_number,
        profile_picture_url: data.profile_picture_url,
      };
      
      setProfile(profileData);
    } catch (error) {
      console.error("Erreur lors du chargement du profil:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger votre profil",
        variant: "destructive",
      });
    }
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('profile_pictures')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile_pictures')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('interpreter_profiles')
        .update({ profile_picture_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, profile_picture_url: publicUrl } : null);
      
      toast({
        title: "Photo de profil mise à jour",
        description: "Votre photo de profil a été mise à jour avec succès",
      });
    } catch (error) {
      console.error("Erreur lors de l'upload de la photo:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour votre photo de profil",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (newStatus: Profile['status']) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from("interpreter_profiles")
        .update({ status: newStatus })
        .eq("id", user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, status: newStatus } : null);
      toast({
        title: "Statut mis à jour",
        description: "Votre statut a été mis à jour avec succès",
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour votre statut",
        variant: "destructive",
      });
    }
  };

  const handleProfileUpdate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !profile) return;

      const languageStrings = profile.languages.map(pair => `${pair.source} → ${pair.target}`);

      const addressJson = profile.address ? {
        street: profile.address.street,
        postal_code: profile.address.postal_code,
        city: profile.address.city
      } as Json : null;

      const { error } = await supabase
        .from("interpreter_profiles")
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          phone_number: profile.phone_number,
          languages: languageStrings,
          employment_status: profile.employment_status,
          status: profile.status,
          address: addressJson,
          birth_country: profile.birth_country,
          nationality: profile.nationality,
          phone_interpretation_rate: profile.phone_interpretation_rate,
          siret_number: profile.siret_number,
          vat_number: profile.vat_number,
        })
        .eq("id", user.id);

      if (error) throw error;

      setIsEditing(false);
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été mises à jour avec succès",
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error);
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

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-12 w-12 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <AvatarImage src={profile.profile_picture_url || undefined} alt={`${profile.first_name} ${profile.last_name}`} />
                <AvatarFallback>{getInitials(profile.first_name, profile.last_name)}</AvatarFallback>
              </Avatar>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleProfilePictureUpload}
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Bonjour {formatName(profile.first_name)} {profile.last_name.toUpperCase()}</h2>
              <Badge className={statusConfig[profile.status].color}>
                {statusConfig[profile.status].label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Gérer ma disponibilité</h3>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {Object.entries(statusConfig).map(([key, value]) => (
                <Button
                  key={key}
                  onClick={() => handleStatusChange(key as Profile['status'])}
                  variant={profile.status === key ? "default" : "outline"}
                  className={profile.status === key ? value.color : ""}
                >
                  {value.label}
                </Button>
              ))}
            </div>
          </div>

          <Tabs defaultValue="missions" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="missions">Missions</TabsTrigger>
              <TabsTrigger value="profile">Profil</TabsTrigger>
            </TabsList>
            
            <TabsContent value="missions">
              <MissionsTab />
            </TabsContent>
            
            <TabsContent value="profile">
              <Card className="p-6">
                <div className="flex justify-end mb-6">
                  <Button onClick={() => isEditing ? handleProfileUpdate() : setIsEditing(true)}>
                    {isEditing ? "Enregistrer" : "Modifier"}
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">Prénom</Label>
                      <Input
                        id="first_name"
                        value={profile.first_name}
                        onChange={(e) => isEditing && setProfile({ ...profile, first_name: e.target.value })}
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="last_name">Nom</Label>
                      <Input
                        id="last_name"
                        value={profile.last_name}
                        onChange={(e) => isEditing && setProfile({ ...profile, last_name: e.target.value })}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => isEditing && setProfile({ ...profile, email: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Numéro de téléphone</Label>
                    <Input
                      id="phone_number"
                      value={profile.phone_number || ""}
                      onChange={(e) => isEditing && setProfile({ ...profile, phone_number: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Adresse</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="street">Rue</Label>
                        <Input
                          id="street"
                          value={profile.address?.street || ""}
                          onChange={(e) => isEditing && setProfile({
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
                          onChange={(e) => isEditing && setProfile({
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
                          onChange={(e) => isEditing && setProfile({
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="birth_country">Pays de naissance</Label>
                      <Input
                        id="birth_country"
                        value={profile.birth_country || ""}
                        onChange={(e) => isEditing && setProfile({ ...profile, birth_country: e.target.value })}
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nationality">Nationalité</Label>
                      <Input
                        id="nationality"
                        value={profile.nationality || ""}
                        onChange={(e) => isEditing && setProfile({ ...profile, nationality: e.target.value })}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employment_status">Statut professionnel</Label>
                    <Select
                      value={profile.employment_status}
                      onValueChange={(value: Profile['employment_status']) => 
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

                  {profile.employment_status === "self_employed" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="phone_interpretation_rate">Tarif interprétariat téléphonique (€/min)</Label>
                        <Input
                          id="phone_interpretation_rate"
                          type="number"
                          step="0.01"
                          value={profile.phone_interpretation_rate || ""}
                          onChange={(e) => isEditing && setProfile({ ...profile, phone_interpretation_rate: parseFloat(e.target.value) || null })}
                          disabled={!isEditing}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="siret_number">Numéro SIRET</Label>
                        <Input
                          id="siret_number"
                          value={profile.siret_number || ""}
                          onChange={(e) => isEditing && setProfile({ ...profile, siret_number: e.target.value })}
                          disabled={!isEditing}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="vat_number">Numéro de TVA</Label>
                        <Input
                          id="vat_number"
                          value={profile.vat_number || ""}
                          onChange={(e) => isEditing && setProfile({ ...profile, vat_number: e.target.value })}
                          disabled={!isEditing}
                        />
                      </div>
                    </>
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default App;