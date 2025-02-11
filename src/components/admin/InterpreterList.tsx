
import { useState } from "react";
import { Headset, Edit, Trash2, Search } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { StatusFilter } from "@/components/StatusFilter";

type EmploymentStatus = "salaried_aft" | "salaried_aftcom" | "salaried_planet" | "self_employed" | "permanent_interpreter";

interface InterpreterData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  active: boolean;
  tarif_15min: number;
  tarif_5min: number;
  employment_status: EmploymentStatus;
  languages?: string[];
  status?: string;
}

interface InterpreterListProps {
  interpreters: InterpreterData[];
  onToggleStatus: (userId: string, currentActive: boolean) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onEditUser: (user: InterpreterData) => void;
  onResetPassword: (userId: string) => void;
}

const employmentStatusLabels: Record<string, string> = {
  salaried_aft: "Salarié AFTrad",
  salaried_aftcom: "Salarié AFTCOM",
  salaried_planet: "Salarié PLANET",
  self_employed: "Auto-entrepreneur",
  permanent_interpreter: "Interprète permanent",
};

const getEmploymentStatusLabel = (status?: string): string => {
  return status ? employmentStatusLabels[status] || "Non spécifié" : "Non spécifié";
};

export const InterpreterList = ({
  interpreters,
  onToggleStatus,
  onDeleteUser,
  onEditUser,
  onResetPassword,
}: InterpreterListProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmploymentStatus, setSelectedEmploymentStatus] = useState<string | null>(null);

  // Format interpreter data to match the expected format for the InterpreterCard
  const formatInterpreterForDisplay = (interpreter: InterpreterData) => {
    return {
      id: interpreter.id,
      name: `${interpreter.first_name} ${interpreter.last_name}`,
      status: interpreter.status as "available" | "unavailable" | "pause" | "busy" || "available",
      employment_status: interpreter.employment_status,
      languages: Array.isArray(interpreter.languages) ? interpreter.languages : [],
      hourlyRate: interpreter.tarif_15min * 4, // Convert 15min rate to hourly rate
    };
  };

  const filteredInterpreters = interpreters.filter((interpreter) => {
    const matchesSearch =
      searchQuery === "" ||
      interpreter.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interpreter.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interpreter.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interpreter.languages?.some((lang) =>
        lang.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesStatus = !selectedStatus || interpreter.status === selectedStatus;
    
    const matchesEmploymentStatus = !selectedEmploymentStatus || 
      interpreter.employment_status === selectedEmploymentStatus;

    return matchesSearch && matchesStatus && matchesEmploymentStatus;
  });

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Headset className="h-6 w-6" />
          <CardTitle>Interprètes ({interpreters.length})</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email ou langue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="w-64">
              <Select
                value={selectedEmploymentStatus || "all"}
                onValueChange={(value) => setSelectedEmploymentStatus(value === "all" ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Statut professionnel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="salaried_aft">Salarié AFTrad</SelectItem>
                  <SelectItem value="salaried_aftcom">Salarié AFTCOM</SelectItem>
                  <SelectItem value="salaried_planet">Salarié PLANET</SelectItem>
                  <SelectItem value="self_employed">Auto-entrepreneur</SelectItem>
                  <SelectItem value="permanent_interpreter">Interprète permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <StatusFilter
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
          />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Statut professionnel</TableHead>
                <TableHead>Tarif (15 min)</TableHead>
                <TableHead>Tarif (5 min)</TableHead>
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
                  <TableCell>{getEmploymentStatusLabel(interpreter.employment_status)}</TableCell>
                  <TableCell>{interpreter.tarif_15min} €</TableCell>
                  <TableCell>{interpreter.tarif_5min} €</TableCell>
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
                        onClick={() => onEditUser(interpreter)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => onResetPassword(interpreter.id)}
                      >
                        Mot de passe
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
    </Card>
  );
};
