
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useSupabaseConnection } from "@/hooks/useSupabaseConnection";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Sidebar } from "./interpreter/Sidebar";
import { StatusManager } from "./interpreter/StatusManager";
import { ThemeToggle } from "./interpreter/ThemeToggle";
import { PasswordChangeDialog } from "./interpreter/PasswordChangeDialog";
import { HowToUseGuide } from "./interpreter/HowToUseGuide";
import { DashboardContent } from "./interpreter/DashboardContent";
import { useInterpreterProfile } from "@/hooks/useInterpreterProfile";

export const InterpreterDashboard = () => {
  const [scheduledMissions, setScheduledMissions] = useState<any[]>([]);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState("missions");
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { 
    profile, 
    setProfile, 
    fetchProfile, 
    handleProfilePictureUpload, 
    handleProfilePictureDelete 
  } = useInterpreterProfile();

  useSupabaseConnection();

  const fetchScheduledMissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('interpretation_missions')
        .select('*')
        .eq('assigned_interpreter_id', user.id)
        .eq('status', 'accepted')
        .not('scheduled_start_time', 'is', null)
        .order('scheduled_start_time', { ascending: true });

      if (error) throw error;
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

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        if (!mounted) return;
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setError("Session expirée. Veuillez vous reconnecter.");
          navigate("/interpreter/login");
          return;
        }

        setAuthChecked(true);
        
        // Sequential loading for better error handling
        await fetchProfile();
        await fetchScheduledMissions();
        
        if (mounted) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[InterpreterDashboard] Initialization error:', error);
        if (mounted) {
          setError("Une erreur est survenue lors de l'initialisation.");
          setIsLoading(false);
          toast({
            title: "Erreur",
            description: "Impossible d'initialiser le tableau de bord",
            variant: "destructive",
          });
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [navigate, toast, fetchProfile]);

  // Early return for loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-background to-muted">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Early return for error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-background to-muted space-y-4">
        <p className="text-destructive font-semibold">{error}</p>
        <button 
          onClick={() => navigate("/interpreter/login")}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 py-2 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors"
        >
          Retourner à la page de connexion
        </button>
      </div>
    );
  }

  // Main dashboard render
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background to-muted">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userStatus={profile?.status || "available"}
      />
      
      <main className="flex-1 p-6 overflow-auto">
        <div className="container mx-auto max-w-7xl">
          <div className="flex justify-between items-center mb-6 bg-card/80 backdrop-blur-sm p-4 rounded-lg shadow-sm">
            <StatusManager
              currentStatus={profile?.status}
              onStatusChange={async (newStatus) => {
                if (profile) {
                  const updatedProfile = { ...profile, status: newStatus };
                  setProfile(updatedProfile);
                }
              }}
            />
            <ThemeToggle />
          </div>

          <DashboardContent
            activeTab={activeTab}
            profile={profile}
            scheduledMissions={scheduledMissions}
            onProfileUpdate={fetchProfile}
            onProfilePictureUpload={handleProfilePictureUpload}
            onProfilePictureDelete={handleProfilePictureDelete}
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
