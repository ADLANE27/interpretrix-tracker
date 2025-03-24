
import { useState, useEffect, useCallback } from "react";
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
import { useGlobalNotification } from "@/hooks/useGlobalNotification";
import { MobileNavigationBar } from "./interpreter/MobileNavigationBar";
import { eventEmitter, EVENT_STATUS_UPDATE } from "@/lib/events";

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
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  useGlobalNotification();
  
  useSupabaseConnection();

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(false);
      
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
        .from('interpreter_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('[InterpreterDashboard] Profile fetch error:', error);
        throw error;
      }

      // Basic validation of profile data
      if (!data) {
        console.error('[InterpreterDashboard] No profile data found');
        throw new Error("Profil introuvable");
      }

      // Validate status
      if (data.status && !isValidStatus(data.status)) {
        console.warn(`[InterpreterDashboard] Invalid status: ${data.status}, defaulting to 'available'`);
        data.status = 'available';
      }

      // Validate address
      if (data.address && !isValidAddress(data.address)) {
        console.warn('[InterpreterDashboard] Invalid address format, setting to null');
        data.address = null;
      }

      // Validate work hours
      if (data.work_hours && !isValidWorkHours(data.work_hours)) {
        console.warn('[InterpreterDashboard] Invalid work hours format, setting to null');
        data.work_hours = null;
      }

      setProfile(data as Profile);
      
      if (!data.password_changed) {
        setIsPasswordDialogOpen(true);
      }
      
      console.log('[InterpreterDashboard] Profile loaded:', data);
    } catch (error) {
      console.error('[InterpreterDashboard] Error in fetchProfile:', error);
      
      toast({
        title: "Erreur",
        description: "Impossible de récupérer votre profil",
        variant: "destructive",
      });
    }
  };

  const fetchScheduledMissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('interpretation_missions')
        .select('*')
        .eq('mission_type', 'scheduled')
        .eq('assigned_interpreter_id', user.id)
        .in('status', ['accepted', 'in_progress'])
        .order('scheduled_start_time', { ascending: true });

      if (error) {
        console.error('[InterpreterDashboard] Scheduled missions fetch error:', error);
        throw error;
      }

      setScheduledMissions(data || []);
    } catch (error) {
      console.error('[InterpreterDashboard] Error in fetchScheduledMissions:', error);
      
      toast({
        title: "Erreur",
        description: "Impossible de récupérer vos missions programmées",
        variant: "destructive",
      });
    }
  };

  // Handle status update with proper error handling and retries
  const handleStatusChange = useCallback(async (newStatus: Profile['status']) => {
    if (!profile || isUpdatingStatus || profile.status === newStatus) {
      return;
    }
    
    console.log('[InterpreterDashboard] Updating status:', newStatus);
    setIsUpdatingStatus(true);
    
    try {
      // Optimistically update the profile locally
      setProfile(prev => prev ? { ...prev, status: newStatus } : null);
      
      // Broadcast the status change to other components
      if (profile.id) {
        eventEmitter.emit(EVENT_STATUS_UPDATE, {
          status: newStatus,
          userId: profile.id
        });
      }
      
      // Update status in the database
      const { error } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: profile.id,
        p_status: newStatus as string
      });

      if (error) {
        console.error('[InterpreterDashboard] Error updating status:', error);
        
        // Revert the optimistic update on error
        setProfile(prev => prev ? { ...prev, status: profile.status } : null);
        
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour votre statut",
          variant: "destructive",
        });
      } else {
        console.log('[InterpreterDashboard] Status updated successfully');
        
        toast({
          title: "Statut mis à jour",
          description: `Votre statut est maintenant "${newStatus}"`,
        });
      }
    } catch (error) {
      console.error('[InterpreterDashboard] Error updating status:', error);
      
      // Revert the optimistic update on error
      setProfile(prev => prev ? { ...prev, status: profile.status } : null);
      
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour de votre statut",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [profile, isUpdatingStatus, toast]);

  // Listen for status updates from other components
  useEffect(() => {
    if (!profile?.id) return;
    
    const handleStatusUpdate = (data: { status: Profile['status'], userId: string }) => {
      if (data.userId === profile.id && data.status !== profile.status) {
        console.log('[InterpreterDashboard] Received status update from event system:', data.status);
        setProfile(prev => prev ? { ...prev, status: data.status } : null);
      }
    };
    
    eventEmitter.on(EVENT_STATUS_UPDATE, handleStatusUpdate);
    
    return () => {
      eventEmitter.off(EVENT_STATUS_UPDATE, handleStatusUpdate);
    };
  }, [profile?.id, profile?.status]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center p-6 max-w-md">
          <h2 className="text-2xl font-bold mb-4">Erreur</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => navigate("/interpreter/login")}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <DashboardHeader
          profile={profile}
          onStatusChange={handleStatusChange}
          onMenuClick={() => setIsSidebarOpen(true)}
          isMobile={isMobile}
        />
        
        <div className="flex flex-1">
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            showHelpButton={() => setIsGuideOpen(true)}
          />
          
          <DashboardContent
            activeTab={activeTab}
            profile={profile}
            onProfileUpdated={fetchProfile}
            onMissionsUpdated={fetchScheduledMissions}
            scheduledMissions={scheduledMissions}
          />
        </div>
        
        {isMobile && (
          <MobileNavigationBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            showHelpButton={() => setIsGuideOpen(true)}
          />
        )}
      </div>
      
      <PasswordChangeDialog
        isOpen={isPasswordDialogOpen}
        onClose={() => setIsPasswordDialogOpen(false)}
        onPasswordChange={fetchProfile}
      />
      
      <HowToUseGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </>
  );
};
