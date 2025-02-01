import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserCog, Clock, Bell, CheckCircle, Settings } from "lucide-react";

interface AdminHowToUseGuideProps {
  onOpenChange: (open: boolean) => void;
}

export const AdminHowToUseGuide = ({ onOpenChange }: AdminHowToUseGuideProps) => {
  return (
    <Dialog defaultOpen onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Guide d'utilisation - Espace Administrateur</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[80vh] pr-4">
          <div className="space-y-6 py-4">
            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <UserCog className="h-5 w-5 text-blue-500" />
                Gestion des interprètes
              </h3>
              <div className="ml-7 space-y-2">
                <p>Dans l'onglet "Interprètes" :</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Visualisez tous les interprètes et leur statut actuel</li>
                  <li>Filtrez par nom, langues, pays de naissance, etc.</li>
                  <li>Gérez les profils des interprètes</li>
                  <li>Activez ou désactivez les comptes</li>
                </ul>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-500" />
                Gestion des missions
              </h3>
              <div className="ml-7 space-y-2">
                <p>Dans l'onglet "Missions" :</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Créez des missions immédiates ou programmées</li>
                  <li>Suivez l'état des missions en cours</li>
                  <li>Consultez l'historique des missions</li>
                  <li>Gérez les assignations d'interprètes</li>
                </ul>
                <div className="bg-gray-50 p-4 rounded-lg mt-2">
                  <p className="font-semibold">Types de missions :</p>
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li><span className="font-semibold">Missions immédiates</span> : Pour les besoins urgents</li>
                    <li><span className="font-semibold">Missions programmées</span> : Planifiées à l'avance</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Bell className="h-5 w-5 text-yellow-500" />
                Système de notifications
              </h3>
              <div className="ml-7 space-y-2">
                <p>Gestion des notifications :</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Les interprètes reçoivent des notifications pour les nouvelles missions</li>
                  <li>Suivez les accusés de réception des notifications</li>
                  <li>Gérez les préférences de notification par interprète</li>
                </ul>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5 text-gray-500" />
                Gestion des utilisateurs
              </h3>
              <div className="ml-7 space-y-2">
                <p>Dans l'onglet "Utilisateurs" :</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Gérez les comptes administrateurs</li>
                  <li>Ajoutez de nouveaux interprètes</li>
                  <li>Modifiez les droits d'accès</li>
                  <li>Réinitialisez les mots de passe</li>
                </ul>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Bonnes pratiques
              </h3>
              <div className="ml-7 space-y-2">
                <ul className="list-disc ml-6 space-y-1">
                  <li>Vérifiez régulièrement les statuts des interprètes</li>
                  <li>Surveillez les missions en attente d'acceptation</li>
                  <li>Maintenez à jour les informations des interprètes</li>
                  <li>Documentez les incidents ou situations particulières</li>
                </ul>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};