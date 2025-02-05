
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AvailableUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'interpreter';
}

interface AvailableUsersListProps {
  users: AvailableUser[];
  onAddUser: (userId: string) => void;
}

export const AvailableUsersList = ({ users, onAddUser }: AvailableUsersListProps) => {
  if (!users.length) return null;

  return (
    <div>
      <h3 className="font-medium mb-2">Utilisateurs disponibles</h3>
      <div className="space-y-2">
        {users.map(user => (
          <div
            key={user.id}
            className="flex items-center justify-between p-2 rounded-lg border"
          >
            <div>
              <p className="font-medium">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-sm text-muted-foreground">
                {user.email} ({user.role})
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddUser(user.id)}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
