
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search, UserCog, Users } from "lucide-react";
import { AdminCreationForm } from "./forms/AdminCreationForm";
import { InterpreterProfileForm } from "./forms/InterpreterProfileForm";
import { UserTable } from "./components/UserTable";
import { useUserManagement } from "./hooks/useUserManagement";

export const UserManagement = () => {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const { toast } = useToast();

  const {
    users,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    handleDeleteUser,
    queryClient,
    isSubmitting,
    setIsSubmitting,
    refetch
  } = useUserManagement();

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Erreur lors du chargement des utilisateurs. Veuillez réessayer.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <UserCog className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Gestion des utilisateurs</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                Ajouter un administrateur
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un nouvel administrateur</DialogTitle>
                <DialogDescription>
                  Un email sera envoyé à l'administrateur avec les instructions de connexion.
                </DialogDescription>
              </DialogHeader>
              <AdminCreationForm
                onSubmit={async (data) => {
                  try {
                    const { error } = await supabase.functions.invoke('send-admin-invitation', {
                      body: data,
                    });
                    if (error) throw error;
                    toast({
                      title: "Administrateur ajouté",
                      description: "Un email d'invitation a été envoyé",
                    });
                    setIsAddAdminOpen(false);
                    refetch();
                  } catch (error: any) {
                    toast({
                      title: "Erreur",
                      description: "Impossible d'ajouter l'administrateur: " + error.message,
                      variant: "destructive",
                    });
                  }
                }}
                isSubmitting={isSubmitting}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button>
                Ajouter un interprète
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <ScrollArea className="max-h-[85vh] px-1">
                <DialogHeader>
                  <DialogTitle>Ajouter un nouvel interprète</DialogTitle>
                  <DialogDescription>
                    Un email sera envoyé à l'interprète avec les instructions de connexion.
                  </DialogDescription>
                </DialogHeader>
                <InterpreterProfileForm
                  isEditing={true}
                  onSubmit={async (data) => {
                    try {
                      const { error } = await supabase.functions.invoke('send-invitation-email', {
                        body: data,
                      });
                      if (error) throw error;
                      toast({
                        title: "Interprète ajouté",
                        description: "Un email d'invitation a été envoyé",
                      });
                      setIsAddUserOpen(false);
                      refetch();
                    } catch (error: any) {
                      toast({
                        title: "Erreur",
                        description: "Impossible d'ajouter l'interprète: " + error.message,
                        variant: "destructive",
                      });
                    }
                  }}
                  isSubmitting={isSubmitting}
                />
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un utilisateur..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="space-y-6">
        <div className="rounded-md border">
          <div className="bg-muted/50 p-4 flex items-center gap-2 border-b">
            <UserCog className="h-5 w-5" />
            <h3 className="font-semibold">Administrateurs</h3>
          </div>
          <UserTable 
            users={users.admins} 
            onDelete={handleDeleteUser}
          />
        </div>

        <div className="rounded-md border">
          <div className="bg-muted/50 p-4 flex items-center gap-2 border-b">
            <Users className="h-5 w-5" />
            <h3 className="font-semibold">Interprètes</h3>
          </div>
          <UserTable 
            users={users.interpreters}
            onDelete={handleDeleteUser}
          />
        </div>
      </div>
    </div>
  );
};
