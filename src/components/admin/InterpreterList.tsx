import { useState, useEffect } from "react";
import { UserCog, Search, Trash2, Key, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
import { Badge } from "@/components/ui/badge";
import { InterpreterProfileForm, type InterpreterFormData } from "./forms/InterpreterProfileForm";
import { convertStringsToLanguagePairs, type LanguagePair } from "@/types/languages";

interface InterpreterData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  active: boolean;
  languages: string[];
  status?: "available" | "unavailable" | "pause" | "busy";
  phone_number?: string | null;
  tarif_5min: number;
  tarif_15min: number;
  employment_status: "salaried_aft" | "salaried_aftcom" | "salaried_planet" | "self_employed" | "permanent_interpreter";
}

interface InterpreterListProps {
  interpreters: InterpreterData[];
  onToggleStatus: (userId: string, currentActive: boolean) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onResetPassword: (userId: string) => void;
  onUpdateInterpreter: (userId: string, data: InterpreterFormData) => Promise<void>;
}

const statusConfig = {
  available: {
    label: "Disponible",
    classes: "bg-green-100 text-green-800"
  },
  busy: {
    label: "En appel",
    classes: "bg-yellow-100 text-yellow-800"
  },
  pause: {
    label: "En pause",
    classes: "bg-blue-100 text-blue-800"
  },
  unavailable: {
    label: "Indisponible",
    classes: "bg-red-100 text-red-800"
  }
};

export const InterpreterList = ({ 
  interpreters: initialInterpreters, 
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
  const [interpreters, setInterpreters] = useState<InterpreterData[]>(initialInterpreters);

  // Subscribe to real-time updates
  useEffect(() => {
    console.log("[InterpreterList] Setting up real-time subscription");
    
    const channel = supabase
      .channel('interpreter-profiles-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'interpreter_profiles'
        },
        (payload: any) => {
          console.log("[InterpreterList] Received update:", payload);
          const updatedProfile = payload.new;
          
          setInterpreters(currentInterpreters => 
            currentInterpreters.map(interpreter => 
              interpreter.id === updatedProfile.id
                ? { ...interpreter, ...updatedProfile }
                : interpreter
            )
          );
        }
      )
      .subscribe((status) => {
        console.log("[InterpreterList] Subscription status:", status);
      });

    return () => {
      console.log("[InterpreterList] Cleaning up subscription");
      supabase.removeChannel(channel);
    };
  }, []);

  // Update local state when props change
  useEffect(() => {
    setInterpreters(initialInterpreters);
  }, [initialInterpreters]);

  const filteredInterpreters = searchQuery ? interpreters.filter((interpreter) => {
    const searchTerm = searchQuery.toLowerCase();
    return (
      interpreter.first_name?.toLowerCase().includes(searchTerm) ||
      interpreter.last_name?.toLowerCase().includes(searchTerm) ||
      interpreter.email?.toLowerCase().includes(searchTerm) ||
      interpreter.languages?.some(lang => 
        lang.toLowerCase().includes(searchTerm)
      )
    );
  }) : interpreters;

  const handleEdit = (interpreter: InterpreterData) => {
    setSelectedInterpreter(interpreter);
    setIsEditDialogOpen(true);
  };

  const handleUpdateSubmit = async (data: InterpreterFormData) => {
    if (!selectedInterpreter) return;
    
    try {
      setIsSubmitting(true);
      const submissionData: InterpreterFormData = {
        ...data,
        languages: data.languages
      };
      await onUpdateInterpreter(selectedInterpreter.id, submissionData);
      setIsEditDialogOpen(false);
      setSelectedInterpreter(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusDisplay = (interpreter: InterpreterData) => {
    const status = interpreter.status || 'unavailable';
    const config = statusConfig[status];
    
    return (
      <Badge className={config.classes}>
        {config.label}
      </Badge>
    );
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
                        <Badge
                          key={index}
                          variant="outline"
                          className="bg-blue-100 text-blue-800"
                        >
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusDisplay(interpreter)}
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
                initialData={{
                  ...selectedInterpreter,
                  languages: convertStringsToLanguagePairs(selectedInterpreter.languages)
                }}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
