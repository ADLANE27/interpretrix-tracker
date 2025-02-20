import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MissionsTab } from "./interpreter/MissionsTab";
import { MessagingTab } from "./interpreter/MessagingTab";
import { InterpreterProfile } from "./interpreter/InterpreterProfile";
import { PasswordChangeDialog } from "./interpreter/PasswordChangeDialog";
import { StatusManager } from "./interpreter/StatusManager";
import { HowToUseGuide } from "./interpreter/HowToUseGuide";
import { MissionsCalendar } from "./interpreter/MissionsCalendar";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "./interpreter/Sidebar";
import { ThemeToggle } from "./interpreter/ThemeToggle";
import { useSupabaseConnection } from "@/hooks/useSupabaseConnection";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { motion, AnimatePresence } from "framer-motion";

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
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  useSupabaseConnection();

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

      setProfile(data as Profile);
    } catch (error) {
      console.error("[InterpreterDashboard] Error loading profile:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger votre profil",
        variant: "destructive"
      });
    }
  };

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
        <button 
          onClick={() => navigate("/interpreter/login")}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 inline-flex items-center justify-center rounded-md text-sm font-medium"
        >
          Retourner à la page de connexion
        </button>
      </div>
    );
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case "missions":
        return <MissionsTab />;
      case "messages":
        return <MessagingTab />;
      case "profile":
        return <InterpreterProfile profile={profile} onProfileUpdate={fetchProfile} />;
      case "calendar":
        return <MissionsCalendar missions={scheduledMissions} />;
      default:
        return <MissionsTab />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userStatus={profile?.status || "available"}
      />
      
      <main className="flex-1 p-6">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-6">
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

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <Card className="p-6 shadow-lg backdrop-blur-sm bg-card/80">
                {renderActiveTab()}
              </Card>
            </motion.div>
          </AnimatePresence>
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
