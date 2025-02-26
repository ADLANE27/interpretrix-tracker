
import { UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Member {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'interpreter';
  joined_at: string;
}

interface MemberListProps {
  channelId: string;
  channelType: 'group' | 'direct';
  userRole: 'admin' | 'interpreter';
}

export const MemberList = ({ channelId, channelType, userRole }: MemberListProps) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const { data, error } = await supabase
          .from('channel_members')
          .select(`
            user_id,
            users:user_id (
              email,
              first_name,
              last_name,
              role
            ),
            joined_at
          `)
          .eq('channel_id', channelId);

        if (error) throw error;

        const formattedMembers = data.map(member => ({
          user_id: member.user_id,
          email: member.users.email,
          first_name: member.users.first_name,
          last_name: member.users.last_name,
          role: member.users.role,
          joined_at: member.joined_at,
        }));

        setMembers(formattedMembers);
      } catch (error) {
        console.error('Error fetching members:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les membres",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [channelId]);

  const handleRemoveMember = async (member: Member) => {
    try {
      const { error } = await supabase
        .from('channel_members')
        .delete()
        .eq('channel_id', channelId)
        .eq('user_id', member.user_id);

      if (error) throw error;

      setMembers(prev => prev.filter(m => m.user_id !== member.user_id));
      toast({
        title: "Succès",
        description: "Membre retiré du canal"
      });
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Erreur",
        description: "Impossible de retirer le membre",
        variant: "destructive"
      });
    }
  };

  if (!members.length) return null;

  return (
    <div>
      <h3 className="font-medium mb-2">Membres actuels</h3>
      <div className="space-y-2">
        {members.map(member => (
          <div
            key={member.user_id}
            className="flex items-center justify-between p-2 rounded-lg border"
          >
            <div>
              <p className="font-medium">
                {member.first_name} {member.last_name}
              </p>
              <p className="text-sm text-muted-foreground">
                {member.email} ({member.role})
              </p>
            </div>
            {userRole === 'admin' && channelType === 'group' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleRemoveMember(member)}
              >
                <UserMinus className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
