
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/profile';
import InterpreterDashboard from '@/components/interpreter/InterpreterDashboard';
import { realtimeService } from '@/services/realtimeService';

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
        const { data: profile, error } = await supabase
          .from('interpreter_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error || !profile) {
          console.error('[Interpreter] Error fetching profile:', error);
          navigate('/login');
          return;
        }

        setProfile(profile);
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
