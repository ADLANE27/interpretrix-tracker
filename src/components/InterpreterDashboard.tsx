import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MissionsTab } from "./interpreter/MissionsTab";
import { InterpreterProfile } from "./interpreter/InterpreterProfile";
import { PasswordChangeDialog } from "./interpreter/PasswordChangeDialog";
import { ProfileHeader } from "./interpreter/ProfileHeader";
import { StatusManager } from "./interpreter/StatusManager";
import { NotificationPermission } from "./interpreter/NotificationPermission";
import { HowToUseGuide } from "./interpreter/HowToUseGuide";
import { MissionsCalendar } from "./interpreter/MissionsCalendar";
import { MessagingTab } from "./interpreter/MessagingTab";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  languages: { source: string; target: string }[];
  employment_status: "salaried" | "self_employed";
  status: "available" | "busy" | "pause" | "unavailable";
  address: {
    street: string;
    postal_code: string;
    city: string;
  } | null;
  birth_country: string | null;
  nationality: string | null;
  phone_interpretation_rate: number | null;
  siret_number: string | null;
  vat_number: string | null;
  profile_picture_url: string | null;
  password_changed: boolean;
}

export const InterpreterDashboard = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [scheduledMissions, setScheduledMissions] = useState<any[]>([]);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [unreadMentions, setUnreadMentions] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
    fetchScheduledMissions();
    fetchUnreadMentions();
    console.log('[Mentions] Setting up realtime subscriptions for user:', profile?.id);

    // Listen for mentionsRead event
    const handleMentionsRead = () => {
      fetchUnreadMentions();
    };
    window.addEventListener('mentionsRead', handleMentionsRead);

    // Set up realtime subscription for mentions
    const mentionsChannel = supabase
      .channel('interpreter-mentions-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_mentions'
        },
        async (payload) => {
          console.log('[Mentions] New mention received:', payload);
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // Check if it's a direct mention
          if (payload.new.mentioned_user_id === user.id) {
            console.log('[Mentions] Direct mention detected');
            fetchUnreadMentions();
            return;
          }

          // Check if it's a language mention that matches interpreter's languages
          const { data: profile } = await supabase
            .from('interpreter_profiles')
            .select('languages')
            .eq('id', user.id)
            .single();

          if (profile && profile.languages) {
            const targetLanguages = profile.languages.map(lang => {
              const [_, target] = lang.split(' → ');
              return target.trim();
            });

            console.log('[Mentions] Checking language mention:', payload.new.mentioned_language);
            console.log('[Mentions] Against target languages:', targetLanguages);

            if (payload.new.mentioned_language && targetLanguages.includes(payload.new.mentioned_language)) {
              console.log('[Mentions] Language mention matches interpreter target language');
              fetchUnreadMentions();
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[Mentions] Subscription status:', status);
      });

    return () => {
      console.log('[Mentions] Cleaning up subscriptions');
      window.removeEventListener('mentionsRead', handleMentionsRead);
      supabase.removeChannel(mentionsChannel);
    };
  }, [profile?.id]);

  const fetchUnreadMentions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[Mentions] No authenticated user found');
        return;
      }

      console.log('[Mentions] Fetching mentions for user:', user.id);

      // First get interpreter's target languages
      const { data: profile } = await supabase
        .from('interpreter_profiles')
        .select('languages')
        .eq('id', user.id)
        .single();

      if (!profile) {
        console.error('[Mentions] No interpreter profile found');
        return;
      }

      // Extract target languages from language pairs
      const targetLanguages = profile.languages.map(lang => {
        const [_, target] = lang.split(' → ');
        return target.trim();
      });

      console.log('[Mentions] Interpreter target languages:', targetLanguages);

      // Count both direct mentions and language mentions
      const { count, error } = await supabase
        .from('message_mentions')
        .select('*', { count: 'exact', head: true })
        .or(`mentioned_user_id.eq.${user.id},mentioned_language.in.(${targetLanguages.map(lang => `"${lang}"`).join(',')})`)
        .is('read_at', null)
        .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('[Mentions] Error fetching mentions:', error);
        throw error;
      }

      console.log('[Mentions] Found unread mentions:', count);
      setUnreadMentions(count || 0);
    } catch (error) {
      console.error("[Mentions] Error in fetchUnreadMentions:", error);
      toast({
        title: "Error",
        description: "Could not fetch unread mentions",
        variant: "destructive",
      });
    }
  };

  const fetchScheduledMissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from('interpretation_missions')
        .select('*')
        .eq('assigned_interpreter_id', user.id)
        .eq('status', 'accepted')
        .eq('mission_type', 'scheduled');

      if (error) throw error;
      
      setScheduledMissions(data || []);
    } catch (error) {
      console.error("Error fetching scheduled missions:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les missions programmées",
        variant: "destructive",
      });
    }
  };

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("interpreter_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      
      const languagePairs = data.languages.map((lang: string) => {
        const [source, target] = lang.split(" → ");
        return { source, target };
      });

      const addressData = data.address as { street: string; postal_code: string; city: string; } | null;
      const transformedAddress = addressData ? {
        street: addressData.street || "",
        postal_code: addressData.postal_code || "",
        city: addressData.city || "",
      } : null;

      setProfile({
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone_number: data.phone_number,
        languages: languagePairs,
        employment_status: data.employment_status,
        status: (data.status || 'available') as Profile['status'],
        address: transformedAddress,
        birth_country: data.birth_country,
        nationality: data.nationality,
        phone_interpretation_rate: data.phone_interpretation_rate,
        siret_number: data.siret_number,
        vat_number: data.vat_number,
        profile_picture_url: data.profile_picture_url,
        password_changed: data.password_changed,
      });
    } catch (error) {
      console.error("Erreur lors du chargement du profil:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger votre profil",
        variant: "destructive",
      });
    }
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile_pictures')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile_pictures')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('interpreter_profiles')
        .update({ profile_picture_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await fetchProfile();

      toast({
        title: "Photo de profil mise à jour",
        description: "Votre photo de profil a été mise à jour avec succès",
      });
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour votre photo de profil",
        variant: "destructive",
      });
    }
  };

  const handleProfilePictureDelete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error: updateError } = await supabase
        .from('interpreter_profiles')
        .update({ profile_picture_url: null })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await fetchProfile();

      toast({
        title: "Photo de profil supprimée",
        description: "Votre photo de profil a été supprimée avec succès",
      });
    } catch (error) {
      console.error("Error deleting profile picture:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer votre photo de profil",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (newStatus: Profile['status']) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from('interpreter_profiles')
        .update({ status: newStatus })
        .eq('id', user.id);

      if (error) throw error;

      await fetchProfile();

      toast({
        title: "Statut mis à jour",
        description: "Votre statut a été mis à jour avec succès",
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour votre statut",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté avec succès",
      });
      navigate("/");
    } catch (error) {
      console.error("Error logging out:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la déconnexion",
        variant: "destructive",
      });
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Chargement de votre profil...</div>
      </div>
    );
  }

  if (!profile.password_changed) {
    return (
      <PasswordChangeDialog
        isOpen={true}
        onClose={() => {}}
        onSuccess={fetchProfile}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <ProfileHeader
                firstName={profile.first_name}
                lastName={profile.last_name}
                status={profile.status}
                profilePictureUrl={profile.profile_picture_url}
                onAvatarClick={() => fileInputRef.current?.click()}
                onDeletePicture={handleProfilePictureDelete}
              />
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <HowToUseGuide />
                  <NotificationPermission interpreterId={profile.id} />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleLogout}
                  className="ml-2 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Se déconnecter"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Status Manager Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <StatusManager
              currentStatus={profile.status}
              onStatusChange={handleStatusChange}
            />
          </div>

          {/* Main Content Section */}
          <Card className="shadow-sm">
            <Tabs defaultValue="missions" className="w-full">
              <div className="border-b">
                <TabsList className="w-full justify-start h-12 bg-transparent p-0">
                  <TabsTrigger 
                    value="missions"
                    className="data-[state=active]:bg-background rounded-none border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none px-6"
                  >
                    Missions
                  </TabsTrigger>
                  <TabsTrigger 
                    value="calendar"
                    className="data-[state=active]:bg-background rounded-none border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none px-6"
                  >
                    Calendrier
                  </TabsTrigger>
                  <TabsTrigger 
                    value="messages"
                    className="data-[state=active]:bg-background rounded-none border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none px-6 relative"
                  >
                    Messages
                    {unreadMentions > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="ml-2 absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center p-0 rounded-full"
                      >
                        {unreadMentions}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="profile"
                    className="data-[state=active]:bg-background rounded-none border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none px-6"
                  >
                    Mon Profil
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6 min-h-[600px]">
                <TabsContent value="missions" className="m-0 h-full">
                  <MissionsTab />
                </TabsContent>
                
                <TabsContent value="calendar" className="m-0 h-full">
                  <MissionsCalendar 
                    missions={scheduledMissions}
                  />
                </TabsContent>

                <TabsContent value="messages" className="m-0 h-full">
                  <MessagingTab onMentionsRead={fetchUnreadMentions} />
                </TabsContent>
                
                <TabsContent value="profile" className="m-0 h-full">
                  <InterpreterProfile />
                </TabsContent>
              </div>
            </Tabs>
          </Card>

          {/* Hidden file input for profile picture */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleProfilePictureUpload}
          />

          {/* Footer */}
          <footer className="text-center text-sm text-gray-500 pt-4">
            © {new Date().getFullYear()} AFTraduction. Tous droits réservés.
          </footer>
        </div>
      </div>
    </div>
  );
};
