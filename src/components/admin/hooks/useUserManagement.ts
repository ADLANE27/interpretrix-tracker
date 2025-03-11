
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserData } from "../types/user-management";
import { useUserManagementToasts } from "./useUserManagementToasts";
import { useAdminUsers } from "./useAdminUsers";
import { useInterpreterUsers } from "./useInterpreterUsers";
import { Profile } from "@/types/profile";

export const useUserManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  const { showSuccessToast, showErrorToast, showLoadingToast } = useUserManagementToasts();

  const { admins, isLoading: isLoadingAdmins, error: adminError } = useAdminUsers();
  const { interpreters, isLoading: isLoadingInterpreters, error: interpreterError } = useInterpreterUsers();

  const handleDeleteUser = async (userId: string) => {
    try {
      const loadingToast = showLoadingToast(
        "Suppression en cours",
        "L'utilisateur est en cours de suppression..."
      );

      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (error) throw error;

      await new Promise(resolve => setTimeout(resolve, 1000));
      loadingToast.dismiss();

      showSuccessToast(
        "Utilisateur supprimé",
        "L'utilisateur a été supprimé avec succès"
      );

      // The real-time subscriptions will handle the data update
    } catch (error: any) {
      showErrorToast(
        "Erreur lors de la suppression",
        error
      );
    }
  };

  const handleUpdateProfile = async (data: Partial<Profile>) => {
    try {
      const loadingToast = showLoadingToast(
        "Mise à jour en cours",
        "Le profil est en cours de mise à jour..."
      );

      const { error } = await supabase.functions.invoke('update-interpreter-profile', {
        body: {
          ...data,
          languages: data.languages?.map(lang => ({
            source: lang.source,
            target: lang.target
          }))
        },
      });

      if (error) throw error;

      await new Promise(resolve => setTimeout(resolve, 1000));
      loadingToast.dismiss();

      showSuccessToast(
        "Profil mis à jour",
        "Le profil a été mis à jour avec succès"
      );

      // The real-time subscription will handle the data update
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showErrorToast(
        "Impossible de mettre à jour le profil",
        error.message || "Une erreur est survenue lors de la mise à jour"
      );
    }
  };

  const filteredUsers = {
    admins: admins.filter(user => {
      const searchTerm = searchQuery.toLowerCase().trim();
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
      const email = (user.email || '').toLowerCase();
      return fullName.includes(searchTerm) || email.includes(searchTerm);
    }),
    interpreters: interpreters.filter(user => {
      const searchTerm = searchQuery.toLowerCase().trim();
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
      const email = user.email.toLowerCase();
      return fullName.includes(searchTerm) || email.includes(searchTerm);
    })
  };

  return {
    users: filteredUsers,
    isLoading: isLoadingAdmins || isLoadingInterpreters,
    error: adminError || interpreterError,
    searchQuery,
    setSearchQuery,
    handleDeleteUser,
    handleUpdateProfile,
    queryClient
  };
};
