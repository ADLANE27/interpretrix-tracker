
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/profile';
import { realtimeService } from '@/services/realtimeService';
import { InterpreterDashboard } from '@/components/InterpreterDashboard';

const Interpreter = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize realtime service once on interpreter page load
  useEffect(() => {
    console.log('[Interpreter] Initializing realtime service');
    const cleanup = realtimeService.init();
    return cleanup;
  }, []);

  // Authentication check and profile fetching
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate('/login');
          return;
        }

        // Fetch interpreter profile
        const { data: profileData, error } = await supabase
          .from('interpreter_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error || !profileData) {
          console.error('[Interpreter] Error fetching profile:', error);
          navigate('/login');
          return;
        }

        // Transform languages from string[] to the required format
        const transformedLanguages = (profileData.languages || []).map((lang: string) => {
          const parts = lang.split('→').map(part => part.trim());
          return { 
            source: parts[0] || '', 
            target: parts[1] || '' 
          };
        });

        // Create a properly typed profile object
        const formattedProfile: Profile = {
          ...profileData,
          languages: transformedLanguages,
          // Ensure other properties match the Profile type
          status: profileData.status as Profile['status'] || 'available',
          work_location: profileData.work_location as any || 'on_site'
        };

        setProfile(formattedProfile);
      } catch (error) {
        console.error('[Interpreter] Error during auth check:', error);
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/login');
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (isLoading) {
    return <div className="h-screen grid place-items-center">Chargement...</div>;
  }

  return profile ? <InterpreterDashboard profile={profile} /> : null;
};

export default Interpreter;
