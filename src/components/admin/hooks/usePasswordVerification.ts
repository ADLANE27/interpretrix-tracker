
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const usePasswordVerification = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();
  const SESSION_KEY = 'userManagementVerification';
  const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours

  const checkSession = () => {
    const sessionData = sessionStorage.getItem(SESSION_KEY);
    if (!sessionData) return false;

    try {
      const session = JSON.parse(sessionData);
      if (session.verified && session.expiresAt > Date.now()) {
        return true;
      }
      sessionStorage.removeItem(SESSION_KEY);
      return false;
    } catch {
      return false;
    }
  };

  const setSession = () => {
    const session = {
      verified: true,
      expiresAt: Date.now() + SESSION_DURATION,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  };

  const verifyPassword = async (password: string): Promise<boolean> => {
    try {
      setIsVerifying(true);
      
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('setting_type', 'user_management_password')
        .single();

      if (error) throw error;

      const isValid = await bcrypt.compare(password, data.value);
      if (!isValid) {
        throw new Error("Mot de passe incorrect");
      }

      setSession();
      return true;
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  return {
    isVerifying,
    verifyPassword,
    checkSession,
  };
};
