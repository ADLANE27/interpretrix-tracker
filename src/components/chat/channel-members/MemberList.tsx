
import { UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Member {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'interpreter';
  joined_at: string;
}

interface MemberListProps {
  members: Member[];
  onRemoveMember: (member: Member) => void;
}

export const MemberList = ({ members, onRemoveMember }: MemberListProps) => {
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
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onRemoveMember(member)}
            >
              <UserMinus className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
