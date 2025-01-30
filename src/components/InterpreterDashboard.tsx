import { useState, useEffect, useRef } from "react";
import { UserCog } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MissionsTab } from "./interpreter/MissionsTab";
import { InterpreterProfile } from "./interpreter/InterpreterProfile";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
  password_changed: boolean;
}

const statusConfig = {
  available: { color: "bg-interpreter-available text-white", label: "Disponible" },
  busy: { color: "bg-interpreter-busy text-white", label: "En appel" },
  pause: { color: "bg-interpreter-pause text-white", label: "En pause" },
  unavailable: { color: "bg-interpreter-unavailable text-white", label: "Indisponible" },
};

export const InterpreterDashboard = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        password_changed: data.password_changed,
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

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      const { error: profileError } = await supabase
        .from('interpreter_profiles')
        .update({ password_changed: true })
        .eq('id', user.id);

      if (profileError) throw profileError;

      setIsPasswordDialogOpen(false);
      setNewPassword("");
      setConfirmPassword("");
      
      toast({
        title: "Mot de passe mis à jour",
        description: "Votre mot de passe a été mis à jour avec succès",
      });
      
      fetchProfile();
    } catch (error) {
      console.error("Error updating password:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour votre mot de passe",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!profile) {
    return <div>Chargement...</div>;
  }

  if (!profile.password_changed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md p-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center">Bienvenue</h2>
            <p className="text-center text-gray-600">
              Pour des raisons de sécurité, veuillez changer votre mot de passe avant d'accéder à votre tableau de bord.
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button 
                className="w-full" 
                onClick={handlePasswordChange}
                disabled={isSubmitting || !newPassword || !confirmPassword}
              >
                {isSubmitting ? "Mise à jour..." : "Mettre à jour le mot de passe"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
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
              <h2 className="text-2xl font-bold">Bonjour {profile.first_name} {profile.last_name}</h2>
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
            <Tabs defaultValue="missions" className="space-y-4">
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
