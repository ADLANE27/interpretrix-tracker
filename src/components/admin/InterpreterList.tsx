import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

interface Interpreter {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  active: boolean;
  employment_status?: string;
  languages?: string[];
}

interface InterpreterListProps {
  interpreters: Interpreter[];
  onToggleStatus: (userId: string, currentActive: boolean) => void;
  onDeleteUser: (userId: string) => void;
  onEditUser: (user: Interpreter) => void;
  onResetPassword: (userId: string) => void;
  onMessageUser: (userId: string) => void;
}

export const InterpreterList = ({
  interpreters,
  onToggleStatus,
  onDeleteUser,
  onEditUser,
  onResetPassword,
  onMessageUser,
}: InterpreterListProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Interprètes</h3>
      <div className="grid gap-4">
        {interpreters.map((interpreter) => (
          <div
            key={interpreter.id}
            className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
          >
            <div>
              <div className="font-medium">
                {interpreter.first_name} {interpreter.last_name}
              </div>
              <div className="text-sm text-gray-600">{interpreter.email}</div>
              <div className={`text-sm ${interpreter.active ? "text-green-600" : "text-red-600"}`}>
                {interpreter.active ? "Actif" : "Inactif"}
              </div>
              {interpreter.languages && (
                <div className="text-sm text-gray-600">
                  Langues: {interpreter.languages.join(", ")}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onMessageUser(interpreter.id)}
                title="Envoyer un message"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => onEditUser(interpreter)}
              >
                Modifier
              </Button>
              <Button
                variant="outline"
                onClick={() => onResetPassword(interpreter.id)}
              >
                Reset Password
              </Button>
              <Button
                variant="outline"
                onClick={() => onToggleStatus(interpreter.id, interpreter.active)}
              >
                {interpreter.active ? "Désactiver" : "Activer"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => onDeleteUser(interpreter.id)}
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