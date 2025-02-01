import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { UserMinus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChannelMember {
  id: string;
  user_id: string;
  channel_id: string;
  user: {
    email: string;
    raw_user_meta_data: {
      first_name: string;
      last_name: string;
    };
  };
}

interface ChannelMembersListProps {
  channelId: string;
  onRemoveMember?: (memberId: string) => void;
}

export const ChannelMembersList = ({ channelId, onRemoveMember }: ChannelMembersListProps) => {
  const { toast } = useToast();

  const { data: members, refetch } = useQuery({
    queryKey: ["channel_members", channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channel_members")
        .select(`
          id,
          user_id,
          channel_id,
          user:user_id (
            email,
            raw_user_meta_data
          )
        `)
        .eq("channel_id", channelId);

      if (error) throw error;
      return data as unknown as ChannelMember[];
    },
  });

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("channel_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Member removed",
        description: "The member has been removed from the channel",
      });

      refetch();
      if (onRemoveMember) onRemoveMember(memberId);
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2 p-4">
        {members?.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
          >
            <div>
              <div className="font-medium">
                {member.user.raw_user_meta_data.first_name}{" "}
                {member.user.raw_user_meta_data.last_name}
              </div>
              <div className="text-sm text-gray-500">{member.user.email}</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveMember(member.id)}
            >
              <UserMinus className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};