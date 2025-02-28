
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
    const checkPassword = async () => {
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
    toast({
      title: "Password Set",
      description: "User management password has been set successfully.",
    });
  };

  const handlePasswordVerify = async (password: string) => {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('setting_type', 'user_management_password')
      .single();

    if (error) throw error;

    const isValid = await bcrypt.compare(password, data.value);
    if (!isValid) {
      throw new Error("Invalid password");
    }

    setIsVerified(true);
    setIsPasswordVerifyOpen(false);
  };

  const handlePasswordChange = async (newPassword: string) => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const { error } = await supabase
      .from('admin_settings')
      .update({ value: hashedPassword })
      .eq('setting_type', 'user_management_password');

    if (error) throw error;

    toast({
      title: "Password Updated",
      description: "User management password has been updated successfully.",
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
