
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Pencil, MoreHorizontal, Key, Trash } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { UserData } from "../types/user-management";
import { InterpreterProfileForm } from "../forms/InterpreterProfileForm";
import { supabase } from "@/integrations/supabase/client";

interface UserTableProps {
  users: UserData[];
  onDelete: (id: string) => void;
  onResetPassword: (id: string) => void;
}

export const UserTable = ({ users, onDelete, onResetPassword }: UserTableProps) => {
  const [isEditingInterpreter, setIsEditingInterpreter] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  const handleEditInterpreter = (user: UserData) => {
    setSelectedUser(user);
    setIsEditingInterpreter(true);
  };

  if (users.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Aucun utilisateur trouvé
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                {user.first_name} {user.last_name}
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.active ? "Actif" : "Inactif"}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {user.role === 'interpreter' && (
                      <DropdownMenuItem onClick={() => handleEditInterpreter(user)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Modifier
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onResetPassword(user.id)}>
                      <Key className="mr-2 h-4 w-4" />
                      Réinitialiser le mot de passe
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete(user.id)}
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isEditingInterpreter} onOpenChange={setIsEditingInterpreter}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Modifier le profil de l'interprète</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[85vh] px-1">
            {selectedUser && (
              <InterpreterProfileForm
                isEditing={true}
                initialData={{
                  email: selectedUser.email || "",
                  first_name: selectedUser.first_name,
                  last_name: selectedUser.last_name,
                  active: selectedUser.active,
                }}
                onSubmit={async (data) => {
                  try {
                    const { error } = await supabase
                      .from('interpreter_profiles')
                      .update({
                        first_name: data.first_name,
                        last_name: data.last_name,
                        phone_number: data.phone_number,
                        address: data.address,
                        birth_country: data.birth_country,
                        nationality: data.nationality,
                        employment_status: data.employment_status,
                        languages: data.languages.map(lang => `${lang.source} → ${lang.target}`),
                        phone_interpretation_rate: data.phone_interpretation_rate,
                        tarif_15min: data.tarif_15min,
                        tarif_5min: data.tarif_5min,
                        siret_number: data.siret_number,
                        vat_number: data.vat_number,
                        specializations: data.specializations,
                        landline_phone: data.landline_phone,
                      })
                      .eq('id', selectedUser.id);

                    if (error) throw error;

                    setIsEditingInterpreter(false);
                    window.location.reload(); // Refresh to see the changes
                  } catch (error: any) {
                    console.error('Error updating interpreter:', error);
                    throw error;
                  }
                }}
                isSubmitting={false}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
