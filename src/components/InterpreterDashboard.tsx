
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
import { motion, AnimatePresence } from "framer-motion";

export const InterpreterDashboard = () => {
  const [scheduledMissions, setScheduledMissions] = useState<any[]>([]);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("missions");
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const { 
    profile, 
    setProfile, 
    fetchProfile, 
    handleProfilePictureUpload, 
    handleProfilePictureDelete,
    isLoading: isProfileLoading,
    error: profileError
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
    let isMounted = true;

    const initializeDashboard = async () => {
      try {
        // Check session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        
        if (!session) {
          console.log('No active session, redirecting to login');
          navigate("/interpreter/login");
          return;
        }

        // Verify interpreter role
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        if (rolesError || roles?.role !== 'interpreter') {
          console.error('User role verification failed:', rolesError);
          throw new Error("Accès non autorisé");
        }

        // Fetch profile and missions
        await fetchProfile();

        if (isMounted) {
          await fetchScheduledMissions();
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('[InterpreterDashboard] Initialization error:', error);
        if (isMounted) {
          setDashboardError(
            error instanceof Error 
              ? error.message 
              : "Une erreur est survenue lors de l'initialisation"
          );
          toast({
            title: "Erreur",
            description: "Impossible d'initialiser le tableau de bord",
            variant: "destructive",
          });
        }
      }
    };

    initializeDashboard();

    return () => {
      isMounted = false;
    };
  }, [navigate, toast, fetchProfile]);

  // Handle loading state
  if (isProfileLoading && !isInitialized) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex items-center justify-center h-screen bg-background"
      >
        <LoadingSpinner size="lg" />
      </motion.div>
    );
  }

  // Handle error state
  if (dashboardError || profileError) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="flex flex-col items-center justify-center h-screen bg-background space-y-4"
      >
        <p className="text-destructive font-medium">
          {dashboardError || (profileError instanceof Error ? profileError.message : "Erreur de chargement du profil")}
        </p>
        <button 
          onClick={() => navigate("/interpreter/login")}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors"
        >
          Retourner à la page de connexion
        </button>
      </motion.div>
    );
  }

  // Handle no profile state
  if (!profile) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex items-center justify-center h-screen bg-background"
      >
        <p className="text-muted-foreground">Chargement du profil...</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-screen bg-background"
    >
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userStatus={profile?.status || "available"}
      />
      
      <main className="flex-1 p-6">
        <div className="container mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-between items-center mb-6"
          >
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
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <DashboardContent
                activeTab={activeTab}
                profile={profile}
                scheduledMissions={scheduledMissions}
                onProfileUpdate={fetchProfile}
                onProfilePictureUpload={handleProfilePictureUpload}
                onProfilePictureDelete={handleProfilePictureDelete}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <PasswordChangeDialog
        open={profile?.password_changed === false}
        onOpenChange={setIsPasswordDialogOpen}
        onPasswordChanged={fetchProfile}
      />

      <HowToUseGuide
        open={isGuideOpen}
        onOpenChange={setIsGuideOpen}
      />
    </motion.div>
  );
};
