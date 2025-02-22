
import { useState } from "react";
import { UserCog, Search, Trash2, Key, Edit } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InterpreterProfileForm } from "./forms/InterpreterProfileForm";

interface InterpreterData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  active: boolean;
  languages?: string[];
  status?: string;
  phone_number?: string | null;
  tarif_5min: number;
  tarif_15min: number;
  employment_status: "salaried_aft" | "salaried_aftcom" | "salaried_planet" | "self_employed" | "permanent_interpreter";
  address?: {
    street: string;
    postal_code: string;
    city: string;
  } | null;
  birth_country?: string | null;
  nationality?: string | null;
  phone_interpretation_rate?: number | null;
  siret_number?: string | null;
  vat_number?: string | null;
}

interface InterpreterListProps {
  interpreters: InterpreterData[];
  onToggleStatus: (userId: string, currentActive: boolean) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onResetPassword: (userId: string) => void;
  onUpdateInterpreter: (userId: string, data: any) => Promise<void>;
}

export const InterpreterList = ({ 
  interpreters, 
  onToggleStatus, 
  onDeleteUser, 
  onResetPassword,
  onUpdateInterpreter
}: InterpreterListProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedInterpreter, setSelectedInterpreter] = useState<InterpreterData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredInterpreters = interpreters.filter((interpreter) => {
    const searchTerm = searchQuery.toLowerCase();
    return (
      interpreter.first_name?.toLowerCase().includes(searchTerm) ||
      interpreter.last_name?.toLowerCase().includes(searchTerm) ||
      interpreter.email?.toLowerCase().includes(searchTerm) ||
      interpreter.languages?.some(lang => 
        lang.toLowerCase().includes(searchTerm)
      )
    );
  });

  const handleEdit = (interpreter: InterpreterData) => {
    setSelectedInterpreter(interpreter);
    setIsEditDialogOpen(true);
  };

  const handleUpdateSubmit = async (data: any) => {
    if (!selectedInterpreter) return;
    
    try {
      setIsSubmitting(true);
      await onUpdateInterpreter(selectedInterpreter.id, data);
      setIsEditDialogOpen(false);
      setSelectedInterpreter(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserCog className="h-6 w-6" />
          <CardTitle>Interprètes ({interpreters.length})</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un interprète..."
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
                <TableHead>Langues</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInterpreters.map((interpreter) => (
                <TableRow key={interpreter.id}>
                  <TableCell>
                    {interpreter.first_name} {interpreter.last_name}
                  </TableCell>
                  <TableCell>{interpreter.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {interpreter.languages?.map((lang, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-sm ${
                        interpreter.active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {interpreter.active ? "Actif" : "Inactif"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => onToggleStatus(interpreter.id, interpreter.active)}
                      >
                        {interpreter.active ? "Désactiver" : "Activer"}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(interpreter)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onResetPassword(interpreter.id)}
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => {
                          setUserToDelete(interpreter.id);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cet interprète ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'interprète sera définitivement supprimé du système.
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <ScrollArea className="max-h-[85vh]">
            <DialogHeader>
              <DialogTitle>Modifier le profil de l'interprète</DialogTitle>
              <DialogDescription>
                Modifiez les informations du profil de l'interprète.
              </DialogDescription>
            </DialogHeader>
            {selectedInterpreter && (
              <InterpreterProfileForm
                isEditing={true}
                onSubmit={handleUpdateSubmit}
                isSubmitting={isSubmitting}
                initialData={selectedInterpreter}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
