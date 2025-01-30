import { useState, useEffect, useRef } from "react";
import { UserCog } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { MissionsTab } from "./interpreter/MissionsTab";
import { InterpreterProfile } from "./interpreter/InterpreterProfile";
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

export const InterpreterDashboard = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("interpreter_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      
      // Transform language strings to LanguagePair objects, handling empty arrays
      const languagePairs = (data.languages || []).map((lang: string) => {
        const [source, target] = lang.split(" → ");
        return { source, target };
      });

      // Handle potentially null address
      const address = data.address as { street: string; postal_code: string; city: string } | null;
      
      const profileData: Profile = {
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone_number: data.phone_number,
        languages: languagePairs,
        employment_status: data.employment_status || 'salaried',
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
    } finally {
      setIsLoading(false);
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

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
  }

  if (!profile) {
    return <div className="flex items-center justify-center min-h-screen">Erreur de chargement du profil</div>;
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
              <h2 className="text-2xl font-bold">
                Bonjour {profile.first_name || 'Interprète'} {profile.last_name}
              </h2>
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

          <Card className="p-6">
            <Tabs defaultValue="profile" className="space-y-4">
              <TabsList>
                <TabsTrigger value="missions">Missions</TabsTrigger>
                <TabsTrigger value="profile">Mon Profil</TabsTrigger>
              </TabsList>
              <TabsContent value="missions">
                <MissionsTab />
              </TabsContent>
              <TabsContent value="profile">
                <InterpreterProfile />
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
};
