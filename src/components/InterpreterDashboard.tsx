import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "./interpreter/Sidebar";
import { useSupabaseConnection } from "@/hooks/useSupabaseConnection";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { PasswordChangeDialog } from "./interpreter/PasswordChangeDialog";
import { HowToUseGuide } from "./interpreter/HowToUseGuide";
import { DashboardHeader } from "./interpreter/dashboard/DashboardHeader";
import { DashboardContent } from "./interpreter/dashboard/DashboardContent";
import { Profile } from "@/types/profile";
import { useIsMobile } from "@/hooks/use-mobile";
import { WorkLocation } from "@/utils/workLocationStatus";

const isValidStatus = (status: string): status is Profile['status'] => {
  return ['available', 'busy', 'pause', 'unavailable'].includes(status);
};

const isValidAddress = (address: unknown): address is Profile['address'] => {
  if (!address || typeof address !== 'object') return false;
  const addr = address as any;
  return (
    typeof addr.street === 'string' &&
    typeof addr.postal_code === 'string' &&
    typeof addr.city === 'string'
  );
};

const isValidWorkHours = (hours: any): hours is Profile['work_hours'] => {
  if (!hours) return true; // null is valid
  return typeof hours === 'object' &&
    typeof hours.start_morning === 'string' &&
    typeof hours.end_morning === 'string' &&
    typeof hours.start_afternoon === 'string' &&
    typeof hours.end_afternoon === 'string';
};

export const InterpreterDashboard = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [scheduledMissions, setScheduledMissions] = useState<any[]>([]);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState("missions");
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const navigate = useNavigate();
  useSupabaseConnection();

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(false);
      
      // Fix for mobile viewport height
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setError("Session expirée. Veuillez vous reconnecter.");
          navigate("/interpreter/login");
          return;
        }
        
        setAuthChecked(true);
        await Promise.all([fetchProfile(), fetchScheduledMissions()]);
      } catch (error) {
        console.error('[InterpreterDashboard] Initialization error:', error);
        setError("Une erreur est survenue lors de l'initialisation.");
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
  }, [navigate, toast]);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("interpreter_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      const transformedLanguages = (data.languages || []).map((lang: string) => {
        const [source, target] = lang.split('→').map(l => l.trim());
        return { source, target };
      });

      const status = isValidStatus(data.status) ? data.status : 'available';
      const address = isValidAddress(data.address) ? data.address : null;
      const workHours = isValidWorkHours(data.work_hours) ? data.work_hours : null;
      const workLocation = data.work_location as WorkLocation;

      const transformedProfile: Profile = {
        ...data,
        languages: transformedLanguages,
        status,
        address,
        work_hours: workHours,
        booth_number: data.booth_number || null,
        private_phone: data.private_phone || null,
        professional_phone: data.professional_phone || null,
        landline_phone: data.landline_phone || null,
        phone_number: data.phone_number || null,
        birth_country: data.birth_country || null,
        nationality: data.nationality || null,
        siret_number: data.siret_number || null,
        vat_number: data.vat_number || null,
        profile_picture_url: data.profile_picture_url || null,
        specializations: data.specializations || [],
        work_location: workLocation
      };

      setProfile(transformedProfile);
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
      if (!file || !profile) return;

      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('interpreter_profiles')
        .update({ profile_picture_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      await fetchProfile();
      toast({
        title: "Succès",
        description: "Photo de profil mise à jour"
      });
    } catch (error) {
      console.error("[InterpreterDashboard] Error uploading profile picture:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la photo de profil",
        variant: "destructive"
      });
    }
  };

  const handleProfilePictureDelete = async () => {
    try {
      if (!profile) return;

      const { error: updateError } = await supabase
        .from('interpreter_profiles')
        .update({ profile_picture_url: null })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      await fetchProfile();
      toast({
        title: "Succès",
        description: "Photo de profil supprimée"
      });
    } catch (error) {
      console.error("[InterpreterDashboard] Error deleting profile picture:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la photo de profil",
        variant: "destructive"
      });
    }
  };

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
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4 px-4">
        <p className="text-destructive text-center">{error}</p>
        <button 
          onClick={() => navigate("/interpreter/login")}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 inline-flex items-center justify-center rounded-md text-sm font-medium"
        >
          Retourner à la page de connexion
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-full min-h-screen w-full bg-gray-50/50 dark:bg-gray-900 overflow-hidden touch-manipulation">
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-200 md:hidden ${
          isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />
      
      <div 
        className={`fixed md:relative w-[270px] z-50 transition-transform duration-200 h-[100vh] ${
          isMobile ? (isSidebarOpen ? 'translate-x-0' : '-translate-x-full') : ''
        } md:translate-x-0 overflow-hidden`}
        style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
      >
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            if (isMobile) setIsSidebarOpen(false);
          }}
          userStatus={profile?.status || "available"}
          profilePictureUrl={profile?.profile_picture_url}
        />
      </div>
      
      <main className="flex-1 flex flex-col h-full w-full overflow-hidden">
        <DashboardHeader 
          profile={profile}
          onStatusChange={async (newStatus) => {
            if (profile) {
              const updatedProfile = { ...profile, status: newStatus };
              setProfile(updatedProfile);
            }
          }}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          isMobile={isMobile}
        />

        <div className="flex-1 overflow-hidden relative">
          <DashboardContent 
            activeTab={activeTab}
            profile={profile}
            scheduledMissions={scheduledMissions}
            onProfileUpdate={fetchProfile}
            onProfilePictureUpload={handleProfilePictureUpload}
            onProfilePictureDelete={handleProfilePictureDelete}
            onStatusChange={async (newStatus) => {
              if (profile) {
                const updatedProfile = { ...profile, status: newStatus };
                setProfile(updatedProfile);
              }
            }}
            onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          />
        </div>
      </main>

      <PasswordChangeDialog
        open={!profile?.password_changed}
        onOpenChange={setIsPasswordDialogOpen}
        onPasswordChanged={fetchProfile}
      />

      <HowToUseGuide
        open={isGuideOpen}
        onOpenChange={setIsGuideOpen}
      />
    </div>
  );
};
