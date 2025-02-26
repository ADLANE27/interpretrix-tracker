
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
import { InterpreterProfile } from "@/components/interpreter/InterpreterProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Profile } from "@/types/profile";

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
      // Charger les données complètes de l'interprète
      const { data: interpreterData, error } = await supabase
        .from('interpreter_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      // Convertir les langues du format string au format LanguagePair
      const languages = (interpreterData.languages || []).map((lang: string) => {
        const [source, target] = lang.split('→').map(l => l.trim());
        return { source, target };
      });

      // Transformer l'adresse en format attendu
      const address = interpreterData.address && typeof interpreterData.address === 'object' ? {
        street: String((interpreterData.address as any).street || ''),
        postal_code: String((interpreterData.address as any).postal_code || ''),
        city: String((interpreterData.address as any).city || '')
      } : null;

      // Assurez-vous que le status correspond au type attendu
      const status = interpreterData.status as Profile['status'] || 'available';

      // Construire l'objet avec le bon typage
      const userData: UserData = {
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
              <InterpreterProfile
                profile={selectedUser as Profile}
                onProfileUpdate={async () => {
                  try {
                    const { data: updatedUser } = await supabase
                      .from('interpreter_profiles')
                      .select('*')
                      .eq('id', selectedUser.id)
                      .single();

                    if (updatedUser) {
                      // Rafraîchir la liste des utilisateurs
                      if (onDelete) onDelete(selectedUser.id);
                      setIsEditingInterpreter(false);
                    }
                  } catch (error) {
                    console.error('Error refreshing interpreter data:', error);
                    toast({
                      title: "Erreur",
                      description: "Impossible de rafraîchir les données de l'interprète",
                      variant: "destructive",
                    });
                  }
                }}
                onProfilePictureUpload={async (event) => {
                  try {
                    const file = event.target.files?.[0];
                    if (!file || !selectedUser) return;

                    const fileExt = file.name.split('.').pop();
                    const filePath = `${selectedUser.id}/${Math.random()}.${fileExt}`;

                    const { error: uploadError } = await supabase.storage
                      .from('profile-pictures')
                      .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                      .from('profile-pictures')
                      .getPublicUrl(filePath);

                    const { error: updateError } = await supabase
                      .from('interpreter_profiles')
                      .update({ profile_picture_url: publicUrl })
                      .eq('id', selectedUser.id);

                    if (updateError) throw updateError;

                    // Rafraîchir les données
                    const { data: updatedUser } = await supabase
                      .from('interpreter_profiles')
                      .select('*')
                      .eq('id', selectedUser.id)
                      .single();

                    if (updatedUser) {
                      // Mettre à jour la liste des utilisateurs
                      if (onDelete) onDelete(selectedUser.id);
                    }

                    toast({
                      title: "Succès",
                      description: "Photo de profil mise à jour"
                    });
                  } catch (error) {
                    console.error('Error uploading profile picture:', error);
                    toast({
                      title: "Erreur",
                      description: "Impossible de mettre à jour la photo de profil",
                      variant: "destructive"
                    });
                  }
                }}
                onProfilePictureDelete={async () => {
                  try {
                    if (!selectedUser) return;

                    const { error: updateError } = await supabase
                      .from('interpreter_profiles')
                      .update({ profile_picture_url: null })
                      .eq('id', selectedUser.id);

                    if (updateError) throw updateError;

                    // Rafraîchir les données
                    const { data: updatedUser } = await supabase
                      .from('interpreter_profiles')
                      .select('*')
                      .eq('id', selectedUser.id)
                      .single();

                    if (updatedUser) {
                      // Mettre à jour la liste des utilisateurs
                      if (onDelete) onDelete(selectedUser.id);
                    }

                    toast({
                      title: "Succès",
                      description: "Photo de profil supprimée"
                    });
                  } catch (error) {
                    console.error('Error deleting profile picture:', error);
                    toast({
                      title: "Erreur",
                      description: "Impossible de supprimer la photo de profil",
                      variant: "destructive"
                    });
                  }
                }}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
