
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChannelList } from "./ChannelList";
import { Chat } from "@/components/chat/Chat";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const MessagesTab = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  // Check if user is admin
  const { data: isAdmin, isLoading: isCheckingAdmin } = useQuery({
    queryKey: ['isUserAdmin'],
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('[Admin Debug] Error checking admin role:', error);
          return false;
        }

        return roles?.role === 'admin';
      } catch (error) {
        console.error('[Admin Debug] Error in admin check:', error);
        return false;
      }
    }
  });

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannelId(channelId);
  };

  if (isCheckingAdmin) {
    return <div>Loading...</div>;
  }

  if (!isAdmin) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          You do not have permission to access this section.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-4 md:col-span-1">
        <ChannelList 
          onChannelSelect={handleChannelSelect}
        />
      </Card>
      
      {selectedChannelId && (
        <Card className="p-4 md:col-span-2">
          <Chat channelId={selectedChannelId} />
        </Card>
      )}
    </div>
  );
};
