
import { useState } from "react";
import { type ChangeEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/types/interpreter";

export const useInterpreterProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const { toast } = useToast();

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

      // Transform the languages array from strings to objects
      const transformedLanguages = (data.languages || []).map((lang: string) => {
        const [source, target] = lang.split('→').map(l => l.trim());
        return { source, target };
      });

      const transformedProfile: Profile = {
        ...data,
        languages: transformedLanguages,
        status: data.status as Profile["status"] // Ensure correct type casting
      };

      setProfile(transformedProfile);
    } catch (error) {
      console.error("[useInterpreterProfile] Error loading profile:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger votre profil",
        variant: "destructive"
      });
    }
  };

  const handleProfilePictureUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file || !profile) return;

      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('interpreter_profiles')
        .update({ profile_picture_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      await fetchProfile();
      toast({
        title: "Succès",
        description: "Photo de profil mise à jour"
      });
    } catch (error) {
      console.error("[useInterpreterProfile] Error uploading profile picture:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la photo de profil",
        variant: "destructive"
      });
    }
  };

  const handleProfilePictureDelete = async () => {
    try {
      if (!profile) return;

      const { error: updateError } = await supabase
        .from('interpreter_profiles')
        .update({ profile_picture_url: null })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      await fetchProfile();
      toast({
        title: "Succès",
        description: "Photo de profil supprimée"
      });
    } catch (error) {
      console.error("[useInterpreterProfile] Error deleting profile picture:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la photo de profil",
        variant: "destructive"
      });
    }
  };

  return {
    profile,
    setProfile,
    fetchProfile,
    handleProfilePictureUpload,
    handleProfilePictureDelete
  };
};
