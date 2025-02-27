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
import { InterpreterProfileForm } from "@/components/admin/forms/InterpreterProfileForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Profile } from "@/types/profile";
import { useNavigate } from "react-router-dom";

interface UserTableProps {
  users: UserData[];
  onDelete: (id: string) => void;
  onResetPassword: (id: string) => void;
}

export const UserTable = ({ users, onDelete, onResetPassword }: UserTableProps) => {
  const [isEditingInterpreter, setIsEditingInterpreter] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEditInterpreter = async (user: UserData) => {
    try {
      const { data: interpreterData, error } = await supabase
        .from('interpreter_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const languages = (interpreterData.languages || []).map((lang: string) => {
        const [source, target] = lang.split('→').map(l => l.trim());
        return { source, target };
      });

      const address = interpreterData.address && typeof interpreterData.address === 'object' ? {
        street: String((interpreterData.address as any).street || ''),
        postal_code: String((interpreterData.address as any).postal_code || ''),
        city: String((interpreterData.address as any).city || '')
      } : null;

      const status = interpreterData.status as Profile['status'] || 'available';

      const userData = {
        ...user,
        ...interpreterData,
        languages,
        status,
        address,
      };

      setSelectedUser(userData);
      setIsEditingInterpreter(true);
    } catch (error) {
      console.error('Error fetching interpreter data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données de l'interprète",
        variant: "destructive",
      });
    }
  };

  const handleUpdateProfile = async (data: any) => {
    try {
      setIsSubmitting(true);
      
      const formattedLanguages = data.languages.map((lang: any) => 
        `${lang.source}→${lang.target}`
      );

      const { error } = await supabase
        .from('interpreter_profiles')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone_number: data.phone_number,
          languages: formattedLanguages,
          employment_status: data.employment_status,
          address: data.address,
          birth_country: data.birth_country,
          nationality: data.nationality,
          siret_number: data.siret_number,
          vat_number: data.vat_number,
          specializations: data.specializations,
          landline_phone: data.landline_phone,
          tarif_15min: data.tarif_15min,
          tarif_5min: data.tarif_5min
        })
        .eq('id', selectedUser?.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Profil mis à jour avec succès",
      });

      setIsEditingInterpreter(false);
      
      window.dispatchEvent(new CustomEvent('refetchUserData'));
      
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
                initialData={selectedUser}
                onSubmit={handleUpdateProfile}
                isSubmitting={isSubmitting}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
