
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as bcrypt from 'bcryptjs';

const SESSION_KEY = 'userManagementVerification';
const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

interface VerificationSession {
  verified: boolean;
  expiresAt: number;
}

export const useUserManagementPassword = () => {
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [isPasswordSetupOpen, setIsPasswordSetupOpen] = useState(false);
  const [isPasswordVerifyOpen, setIsPasswordVerifyOpen] = useState(false);
  const [isPasswordChangeOpen, setIsPasswordChangeOpen] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const { toast } = useToast();

  const checkSessionValidity = () => {
    const sessionData = sessionStorage.getItem(SESSION_KEY);
    if (!sessionData) return false;

    try {
      const session: VerificationSession = JSON.parse(sessionData);
      if (session.verified && session.expiresAt > Date.now()) {
        return true;
      }
      // Clean up expired session
      sessionStorage.removeItem(SESSION_KEY);
      return false;
    } catch {
      return false;
    }
  };

  const setVerificationSession = () => {
    const session: VerificationSession = {
      verified: true,
      expiresAt: Date.now() + SESSION_DURATION,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  };

  useEffect(() => {
    const checkPassword = async () => {
      // First check if we have a valid session
      if (checkSessionValidity()) {
        setIsPasswordRequired(true);
        setIsVerified(true);
        return;
      }

      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('setting_type', 'user_management_password')
        .single();

      if (!error && data) {
        setIsPasswordRequired(true);
        setIsPasswordVerifyOpen(true);
      } else {
        setIsPasswordSetupOpen(true);
      }
    };

    checkPassword();
  }, []);

  const handlePasswordSetup = async (password: string) => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const { error } = await supabase
      .from('admin_settings')
      .insert([
        {
          setting_type: 'user_management_password',
          value: hashedPassword
        }
      ]);

    if (error) throw error;

    setIsPasswordRequired(true);
    setIsVerified(true);
    setIsPasswordSetupOpen(false);
    setVerificationSession();
    
    toast({
      title: "Mot de passe défini",
      description: "Le mot de passe de gestion des utilisateurs a été défini avec succès.",
    });
  };

  const handlePasswordVerify = async (password: string) => {
    try {
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

      setIsVerified(true);
      setIsPasswordVerifyOpen(false);
      setVerificationSession();
      
      toast({
        title: "Accès accordé",
        description: "Vérification du mot de passe réussie.",
      });
    } catch (error: any) {
      console.error("Verification error:", error);
      throw error;
    }
  };

  const handlePasswordChange = async (newPassword: string) => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const { error } = await supabase
      .from('admin_settings')
      .update({ value: hashedPassword })
      .eq('setting_type', 'user_management_password');

    if (error) throw error;

    setIsPasswordChangeOpen(false);
    setVerificationSession();
    
    toast({
      title: "Mot de passe mis à jour",
      description: "Le mot de passe de gestion des utilisateurs a été mis à jour avec succès.",
    });
  };

  return {
    isPasswordRequired,
    isPasswordSetupOpen,
    setIsPasswordSetupOpen,
    isPasswordVerifyOpen,
    setIsPasswordVerifyOpen,
    isPasswordChangeOpen,
    setIsPasswordChangeOpen,
    isVerified,
    handlePasswordSetup,
    handlePasswordVerify,
    handlePasswordChange,
  };
};
