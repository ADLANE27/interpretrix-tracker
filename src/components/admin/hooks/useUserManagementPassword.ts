
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as bcrypt from 'bcryptjs';

export const useUserManagementPassword = () => {
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [isPasswordSetupOpen, setIsPasswordSetupOpen] = useState(false);
  const [isPasswordVerifyOpen, setIsPasswordVerifyOpen] = useState(false);
  const [isPasswordChangeOpen, setIsPasswordChangeOpen] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const { toast } = useToast();

  // Check if password exists
  useEffect(() => {
    console.log("[useUserManagementPassword] Checking password existence...");
    const checkPassword = async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('setting_type', 'user_management_password')
        .single();

      if (!error && data) {
        console.log("[useUserManagementPassword] Password exists, requiring verification");
        setIsPasswordRequired(true);
        setIsPasswordVerifyOpen(true);
      } else {
        console.log("[useUserManagementPassword] No password found, opening setup");
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
    setIsPasswordSetupOpen(false);  // Ensure dialog closes
    toast({
      title: "Mot de passe défini",
      description: "Le mot de passe de gestion des utilisateurs a été défini avec succès.",
    });
  };

  const handlePasswordVerify = async (password: string) => {
    try {
      console.log("[useUserManagementPassword] Verifying password...");
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

      console.log("[useUserManagementPassword] Password verified successfully");
      setIsVerified(true);
      setIsPasswordVerifyOpen(false);
      toast({
        title: "Accès accordé",
        description: "Vérification du mot de passe réussie.",
      });
    } catch (error: any) {
      console.error("[useUserManagementPassword] Verification error:", error);
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

    setIsPasswordChangeOpen(false);  // Ensure dialog closes
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
