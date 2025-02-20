
import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MissionsTab } from "./interpreter/MissionsTab";
import { MessagingTab } from "./interpreter/MessagingTab";
import { InterpreterProfile } from "./interpreter/InterpreterProfile";
import { PasswordChangeDialog } from "./interpreter/PasswordChangeDialog";
import { ProfileHeader } from "./interpreter/ProfileHeader";
import { StatusManager } from "./interpreter/StatusManager";
import { HowToUseGuide } from "./interpreter/HowToUseGuide";
import { MissionsCalendar } from "./interpreter/MissionsCalendar";
import { LogOut, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { ThemeToggle } from "./interpreter/ThemeToggle";
import { useSupabaseConnection } from "@/hooks/useSupabaseConnection";
import { AnimatePresence, motion } from "framer-motion";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  languages: {
    source: string;
    target: string;
  }[];
  employment_status: "salaried_aft" | "salaried_aftcom" | "salaried_planet" | "self_employed" | "permanent_interpreter";
  status: "available" | "busy" | "pause" | "unavailable";
  address: {
    street: string;
    postal_code: string;
    city: string;
  } | null;
  birth_country: string | null;
  nationality: string | null;
  phone_interpretation_rate: number | null;
  siret_number: string | null;
  vat_number: string | null;
  profile_picture_url: string | null;
  password_changed: boolean;
}

export const InterpreterDashboard = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [scheduledMissions, setScheduledMissions] = useState<any[]>([]);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState("missions");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  useSupabaseConnection();
  const [isConfirmLogoutOpen, setIsConfirmLogoutOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const {
          data: { session },
          error: sessionError
        } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[InterpreterDashboard] Session error:', sessionError);
          setError("Erreur d'authentification. Veuillez vous reconnecter.");
          navigate("/interpreter/login");
          return;
        }
        
        if (!session) {
          console.log('[InterpreterDashboard] No active session');
          setError("Session expirée. Veuillez vous reconnecter.");
          navigate("/interpreter/login");
          return;
        }
        
        setAuthChecked(true);
        await Promise.all([fetchProfile(), fetchScheduledMissions()]);
      } catch (error) {
        console.error('[InterpreterDashboard] Initialization error:', error);
        setError("Une erreur est survenue lors de l'initialisation. Veuillez réessayer.");
        toast({
          title: "Erreur",
          description: "Impossible d'initialiser le tableau de bord",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
    
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[InterpreterDashboard] Auth state changed:', event);
      if (event === 'SIGNED_OUT' || !session) {
        navigate("/interpreter/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchScheduledMissions = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        console.log('[InterpreterDashboard] No authenticated user');
        return;
      }
      console.log('[InterpreterDashboard] Fetching scheduled missions for user:', user.id);
      const {
        data,
        error
      } = await supabase.from('interpretation_missions').select('*').eq('assigned_interpreter_id', user.id).eq('status', 'accepted').not('scheduled_start_time', 'is', null).order('scheduled_start_time', {
        ascending: true
      });
      if (error) {
        console.error('[InterpreterDashboard] Error fetching missions:', error);
        throw error;
      }
      console.log('[InterpreterDashboard] Fetched scheduled missions:', data);
      setScheduledMissions(data || []);
    } catch (error) {
      console.error("[InterpreterDashboard] Error fetching scheduled missions:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les missions programmées",
        variant: "destructive"
      });
    }
  };

  const fetchProfile = async () => {
    try {
      const {
        data: {
          user
        },
        error: userError
      } = await supabase.auth.getUser();
      if (userError) {
        console.error('[InterpreterDashboard] User error:', userError);
        throw userError;
      }
      if (!user) {
        console.log('[InterpreterDashboard] No authenticated user');
        return;
      }
      console.log('[InterpreterDashboard] Fetching profile for user:', user.id);
      const {
        data,
        error
      } = await supabase.from("interpreter_profiles").select("*").eq("id", user.id).single();
      if (error) {
        console.error('[InterpreterDashboard] Error fetching profile:', error);
        throw error;
      }
      const languagePairs = data.languages.map((lang: string) => {
        const [source, target] = lang.split(" → ");
        return {
          source,
          target
        };
      });
      const addressData = data.address as {
        street: string;
        postal_code: string;
        city: string;
      } | null;
      const transformedAddress = addressData ? {
        street: addressData.street || "",
        postal_code: addressData.postal_code || "",
        city: addressData.city || ""
      } : null;
      setProfile({
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone_number: data.phone_number,
        languages: languagePairs,
        employment_status: data.employment_status,
        status: (data.status || 'available') as Profile['status'],
        address: transformedAddress,
        birth_country: data.birth_country,
        nationality: data.nationality,
        phone_interpretation_rate: data.phone_interpretation_rate,
        siret_number: data.siret_number,
        vat_number: data.vat_number,
        profile_picture_url: data.profile_picture_url,
        password_changed: data.password_changed
      });
    } catch (error) {
      console.error("[InterpreterDashboard] Error loading profile:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger votre profil",
        variant: "destructive"
      });
    }
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast({
          title: "Erreur",
          description: "La taille du fichier ne doit pas dépasser 5MB",
          variant: "destructive",
        });
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Erreur",
          description: "Format de fichier non supporté. Utilisez JPG, PNG ou GIF",
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      toast({
        title: "Upload en cours",
        description: "Veuillez patienter pendant le téléchargement de votre photo",
      });

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;
      
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

      await fetchProfile();
      toast({
        title: "Succès",
        description: "Votre photo de profil a été mise à jour",
      });
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de mettre à jour votre photo de profil",
        variant: "destructive",
      });
    }
  };

  const handleProfilePictureDelete = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      const {
        error: updateError
      } = await supabase.from('interpreter_profiles').update({
        profile_picture_url: null
      }).eq('id', user.id);
      if (updateError) throw updateError;
      await fetchProfile();
      toast({
        title: "Photo de profil supprimée",
        description: "Votre photo de profil a été supprimée avec succès"
      });
    } catch (error) {
      console.error("Error deleting profile picture:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer votre photo de profil",
        variant: "destructive"
      });
    }
  };

  const handleStatusChange = async (newStatus: Profile['status']) => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      const {
        error
      } = await supabase.from('interpreter_profiles').update({
        status: newStatus
      }).eq('id', user.id);
      if (error) throw error;
      await fetchProfile();
      toast({
        title: "Statut mis à jour",
        description: "Votre statut a été mis à jour avec succès"
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour votre statut",
        variant: "destructive"
      });
    }
  };

  const handleLogout = async () => {
    setIsConfirmLogoutOpen(false);
    try {
      await supabase.auth.signOut();
      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté avec succès"
      });
      navigate("/interpreter/login");
    } catch (error) {
      console.error("[InterpreterDashboard] Error during logout:", error);
      toast({
        title: "Erreur",
        description: "Impossible de vous déconnecter",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => navigate("/interpreter/login")}>
          Retourner à la page de connexion
        </Button>
      </div>
    );
  }

  if (!profile || !authChecked) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            {isMobile && (
              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-4">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        setIsSheetOpen(false);
                        setIsGuideOpen(true);
                      }}
                    >
                      Guide d'utilisation
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => setIsConfirmLogoutOpen(true)}
                    >
                      <LogOut className="h-4 w-4" />
                      Déconnexion
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            )}
            <ProfileHeader profile={profile} />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {!isMobile && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsGuideOpen(true)}
                >
                  Guide d'utilisation
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setIsConfirmLogoutOpen(true)}
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_300px]">
          <Card className="p-4">
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start">
                <TabsTrigger value="missions">Missions</TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
                <TabsTrigger value="profile">Profil</TabsTrigger>
                <TabsTrigger value="calendar">Calendrier</TabsTrigger>
              </TabsList>
              <div className="mt-4">
                <TabsContent value="missions">
                  <MissionsTab />
                </TabsContent>
                <TabsContent value="messages">
                  <MessagingTab />
                </TabsContent>
                <TabsContent value="profile">
                  <InterpreterProfile
                    profile={profile}
                    onProfileUpdate={fetchProfile}
                    onProfilePictureUpload={handleProfilePictureUpload}
                    onProfilePictureDelete={handleProfilePictureDelete}
                  />
                </TabsContent>
                <TabsContent value="calendar">
                  <MissionsCalendar missions={scheduledMissions} />
                </TabsContent>
              </div>
            </Tabs>
          </Card>
          <div className="space-y-4">
            <StatusManager
              currentStatus={profile.status}
              onStatusChange={handleStatusChange}
            />
          </div>
        </div>
      </div>

      <PasswordChangeDialog
        open={!profile.password_changed}
        onOpenChange={setIsPasswordDialogOpen}
        onPasswordChanged={fetchProfile}
      />

      <HowToUseGuide
        open={isGuideOpen}
        onOpenChange={setIsGuideOpen}
      />

      <ConfirmationDialog
        isOpen={isConfirmLogoutOpen}
        onConfirm={handleLogout}
        onCancel={() => setIsConfirmLogoutOpen(false)}
        title="Déconnexion"
        description="Êtes-vous sûr de vouloir vous déconnecter ?"
        confirmText="Se déconnecter"
        cancelText="Annuler"
      />
    </div>
  );
};
