
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
import { NotificationPermission } from "./interpreter/NotificationPermission";
import { HowToUseGuide } from "./interpreter/HowToUseGuide";
import { MissionsCalendar } from "./interpreter/MissionsCalendar";
import { LogOut, Menu, BookOpen, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  languages: { source: string; target: string }[];
  employment_status: "salaried" | "self_employed";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[InterpreterDashboard] Session error:', sessionError);
        navigate("/interpreter/login");
        return;
      }

      if (!session) {
        console.log('[InterpreterDashboard] No active session');
        navigate("/interpreter/login");
        return;
      }

      setAuthChecked(true);
      await Promise.all([fetchProfile(), fetchScheduledMissions()]);
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[InterpreterDashboard] Auth state changed:', event);
      if (event === 'SIGNED_OUT' || !session) {
        navigate("/interpreter/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchScheduledMissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[InterpreterDashboard] No authenticated user');
        return;
      }

      console.log('[InterpreterDashboard] Fetching scheduled missions for user:', user.id);

      const { data, error } = await supabase
        .from('interpretation_missions')
        .select('*')
        .eq('assigned_interpreter_id', user.id)
        .eq('status', 'accepted')
        .not('scheduled_start_time', 'is', null)
        .order('scheduled_start_time', { ascending: true });

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
        variant: "destructive",
      });
    }
  };

  const fetchProfile = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('[InterpreterDashboard] User error:', userError);
        throw userError;
      }

      if (!user) {
        console.log('[InterpreterDashboard] No authenticated user');
        return;
      }

      console.log('[InterpreterDashboard] Fetching profile for user:', user.id);
      
      const { data, error } = await supabase
        .from("interpreter_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error('[InterpreterDashboard] Error fetching profile:', error);
        throw error;
      }
      
      const languagePairs = data.languages.map((lang: string) => {
        const [source, target] = lang.split(" → ");
        return { source, target };
      });

      const addressData = data.address as { street: string; postal_code: string; city: string; } | null;
      const transformedAddress = addressData ? {
        street: addressData.street || "",
        postal_code: addressData.postal_code || "",
        city: addressData.city || "",
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
        password_changed: data.password_changed,
      });
    } catch (error) {
      console.error("[InterpreterDashboard] Error loading profile:", error);
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
        title: "Photo de profil mise à jour",
        description: "Votre photo de profil a été mise à jour avec succès",
      });
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour votre photo de profil",
        variant: "destructive",
      });
    }
  };

  const handleProfilePictureDelete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error: updateError } = await supabase
        .from('interpreter_profiles')
        .update({ profile_picture_url: null })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await fetchProfile();

      toast({
        title: "Photo de profil supprimée",
        description: "Votre photo de profil a été supprimée avec succès",
      });
    } catch (error) {
      console.error("Error deleting profile picture:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer votre photo de profil",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (newStatus: Profile['status']) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from('interpreter_profiles')
        .update({ status: newStatus })
        .eq('id', user.id);

      if (error) throw error;

      await fetchProfile();

      toast({
        title: "Statut mis à jour",
        description: "Votre statut a été mis à jour avec succès",
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour votre statut",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté avec succès",
      });
      navigate("/interpreter/login");
    } catch (error) {
      console.error("Error logging out:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la déconnexion",
        variant: "destructive",
      });
    }
  };

  if (!authChecked || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="animate-pulse text-lg text-center">Chargement de votre profil...</div>
      </div>
    );
  }

  if (!profile.password_changed) {
    return (
      <PasswordChangeDialog
        isOpen={true}
        onClose={() => {}}
        onSuccess={fetchProfile}
      />
    );
  }

  const tabItems = [
    { value: "missions", label: "Missions" },
    { value: "calendar", label: "Calendrier" },
    { value: "messaging", label: "Messagerie" },
    { value: "profile", label: "Mon Profil" },
  ];

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setIsSheetOpen(false); // Close the sheet when changing tabs
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-3 sm:py-6 px-2 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
          {/* Header Section */}
          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <ProfileHeader
                firstName={profile.first_name}
                lastName={profile.last_name}
                status={profile.status}
                profilePictureUrl={profile.profile_picture_url}
                onAvatarClick={() => fileInputRef.current?.click()}
                onDeletePicture={handleProfilePictureDelete}
              />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {}}
                    className="flex-1 sm:flex-none"
                    title="Guide d'utilisation"
                  >
                    <BookOpen className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="flex-1 sm:flex-none"
                    title="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleLogout}
                    className="flex-1 sm:flex-none hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Se déconnecter"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Status Manager Section */}
          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
            <StatusManager
              currentStatus={profile.status}
              onStatusChange={handleStatusChange}
            />
          </div>

          {/* Main Content Section */}
          <Card className="shadow-sm">
            {isMobile ? (
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">{tabItems.find(tab => tab.value === activeTab)?.label}</h2>
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[80%] sm:w-[385px]">
                    <SheetHeader>
                      <SheetTitle>Navigation</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 flex flex-col gap-2">
                      {tabItems.map((tab) => (
                        <Button
                          key={tab.value}
                          variant={activeTab === tab.value ? "default" : "ghost"}
                          className="w-full justify-start"
                          onClick={() => handleTabChange(tab.value)}
                        >
                          {tab.label}
                        </Button>
                      ))}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            ) : (
              <div className="border-b overflow-x-auto">
                <TabsList className="w-full justify-start h-12 bg-transparent p-0">
                  {tabItems.map((tab) => (
                    <TabsTrigger 
                      key={tab.value}
                      value={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      className="data-[state=active]:bg-background rounded-none border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none px-3 sm:px-6 whitespace-nowrap"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            )}

            <div className="p-2 sm:p-6 min-h-[600px]">
              {activeTab === "missions" && <MissionsTab />}
              {activeTab === "calendar" && (
                <MissionsCalendar missions={scheduledMissions} />
              )}
              {activeTab === "messaging" && <MessagingTab />}
              {activeTab === "profile" && <InterpreterProfile />}
            </div>
          </Card>

          {/* Hidden file input for profile picture */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleProfilePictureUpload}
          />

          {/* Footer */}
          <footer className="text-center text-sm text-gray-500 pt-4">
            © {new Date().getFullYear()} AFTraduction. Tous droits réservés.
          </footer>
        </div>
      </div>
    </div>
  );
};
