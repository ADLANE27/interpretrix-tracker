
import { useState, useEffect } from "react";
import { InterpreterProfile } from "@/components/interpreter/InterpreterProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ChangeEvent } from "react";

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const { toast } = useToast();

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("interpreter_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to fetch profile",
        variant: "destructive",
      });
    }
  };

  const handleProfileUpdate = async () => {
    await fetchProfile();
  };

  const handleProfilePictureUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile_pictures')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile_pictures')
        .getPublicUrl(filePath);

      await supabase
        .from('interpreter_profiles')
        .update({ profile_picture_url: publicUrl })
        .eq('id', user.id);

      await fetchProfile();
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      toast({
        title: "Error",
        description: "Failed to upload profile picture",
        variant: "destructive",
      });
    }
  };

  const handleProfilePictureDelete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await supabase
        .from('interpreter_profiles')
        .update({ profile_picture_url: null })
        .eq('id', user.id);

      await fetchProfile();
    } catch (error) {
      console.error("Error deleting profile picture:", error);
      toast({
        title: "Error",
        description: "Failed to delete profile picture",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <InterpreterProfile
          profile={profile}
          onProfileUpdate={handleProfileUpdate}
          onProfilePictureUpload={handleProfilePictureUpload}
          onProfilePictureDelete={handleProfilePictureDelete}
        />
      </div>
    </div>
  );
};

export default Profile;
