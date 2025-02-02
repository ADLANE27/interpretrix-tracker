import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

interface Admin {
  id: string;
  email: string;
  active: boolean;
}

interface AdminListProps {
  admins: Admin[];
  onToggleStatus: (userId: string, currentActive: boolean) => void;
  onDeleteUser: (userId: string) => void;
  onMessageUser: (userId: string) => void;
}

export const AdminList = ({ admins, onToggleStatus, onDeleteUser, onMessageUser }: AdminListProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Administrateurs</h3>
      <div className="grid gap-4">
        {admins.map((admin) => (
          <div
            key={admin.id}
            className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
          >
            <div>
              <div className="font-medium">{admin.email}</div>
              <div className={`text-sm ${admin.active ? "text-green-600" : "text-red-600"}`}>
                {admin.active ? "Actif" : "Inactif"}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onMessageUser(admin.id)}
                title="Envoyer un message"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => onToggleStatus(admin.id, admin.active)}
              >
                {admin.active ? "Désactiver" : "Activer"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => onDeleteUser(admin.id)}
              >
                Supprimer
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};