
import { useState } from "react";
import { UserCog, Search, Trash2, Key } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AdminData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  active: boolean;
}

interface AdminListProps {
  admins: AdminData[];
  onToggleStatus: (userId: string, currentActive: boolean) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onResetPassword: (userId: string) => void;
}

export const AdminList = ({ admins, onToggleStatus, onDeleteUser, onResetPassword }: AdminListProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAdmins = admins.filter((admin) => {
    const searchTerm = searchQuery.toLowerCase().trim();
    if (searchTerm === '') return true;

    const fullName = `${admin.first_name} ${admin.last_name}`.toLowerCase();
    return (
      fullName.includes(searchTerm) ||
      admin.email.toLowerCase().includes(searchTerm)
    );
  });

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserCog className="h-6 w-6" />
          <CardTitle>Administrateurs ({admins.length})</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un administrateur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAdmins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Aucun administrateur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredAdmins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>
                      {admin.first_name} {admin.last_name}
                    </TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-sm ${
                          admin.active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {admin.active ? "Actif" : "Inactif"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => onToggleStatus(admin.id, admin.active)}
                        >
                          {admin.active ? "Désactiver" : "Activer"}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onResetPassword(admin.id)}
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => {
                            setUserToDelete(admin.id);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cet administrateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'administrateur sera définitivement supprimé du système.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setUserToDelete(null);
              setIsDeleteDialogOpen(false);
            }}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && onDeleteUser(userToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
