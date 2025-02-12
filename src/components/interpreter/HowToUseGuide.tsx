
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, CheckCircle, AlertCircle, ArrowRight, BookOpen } from "lucide-react";

interface HowToUseGuideProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HowToUseGuide = ({ isOpen, onOpenChange }: HowToUseGuideProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="flex-1 sm:flex-none"
          title="Guide d'utilisation"
        >
          <BookOpen className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Guide d'utilisation - Espace Interprète</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[80vh] pr-4">
          <div className="space-y-6 py-4">
            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Gérer votre disponibilité
              </h3>
              <div className="ml-7 space-y-2">
                <p>Utilisez les boutons de statut pour indiquer votre disponibilité :</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li><span className="font-semibold">Disponible</span> : Vous pouvez recevoir des missions</li>
                  <li><span className="font-semibold">En pause</span> : Temporairement indisponible</li>
                  <li><span className="font-semibold">Indisponible</span> : Vous ne recevrez pas de missions</li>
                  <li><span className="font-semibold">En appel</span> : Automatiquement défini lors d'une mission</li>
                </ul>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-500" />
                Recevoir des notifications
              </h3>
              <div className="ml-7 space-y-2">
                <p>Pour ne manquer aucune mission :</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Cliquez sur "Activer les notifications"</li>
                  <li>Acceptez la demande d'autorisation du navigateur</li>
                  <li>Vous recevrez des notifications même lorsque le site est fermé</li>
                </ul>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-purple-500" />
                Gérer les missions
              </h3>
              <div className="ml-7 space-y-2">
                <p>Dans l'onglet "Missions" :</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Consultez les missions disponibles</li>
                  <li>Acceptez ou déclinez les propositions</li>
                  <li>Distinguez les missions immédiates des missions programmées</li>
                </ul>
                <div className="bg-gray-50 p-4 rounded-lg mt-2">
                  <p className="font-semibold">Types de missions :</p>
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li><span className="font-semibold">Missions immédiates</span> : À commencer dès que possible</li>
                    <li><span className="font-semibold">Missions programmées</span> : Planifiées pour une date ultérieure</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Info className="h-5 w-5 text-orange-500" />
                Gérer votre profil
              </h3>
              <div className="ml-7 space-y-2">
                <p>Dans l'onglet "Mon Profil" :</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Mettez à jour vos informations personnelles</li>
                  <li>Gérez vos combinaisons de langues</li>
                  <li>Ajoutez/modifiez votre photo de profil</li>
                  <li>Consultez votre tarif d'interprétation</li>
                </ul>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
