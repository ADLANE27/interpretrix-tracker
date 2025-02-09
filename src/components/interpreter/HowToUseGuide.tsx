
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, CheckCircle, AlertCircle, ArrowRight, BookOpen, X } from "lucide-react";

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
          className="h-9 w-9"
          title="Guide d'utilisation"
        >
          <BookOpen className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl h-[95vh] sm:h-[90vh] flex flex-col p-0 fixed top-[2.5vh] sm:top-[5vh] mx-2">
        <DialogHeader className="p-3 sm:p-6 pb-2 sm:pb-4 border-b bg-white sticky top-0 z-50 flex-shrink-0">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-base sm:text-xl font-bold">
              Guide d'utilisation
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-gray-100"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 overflow-y-auto px-3 sm:px-6 pb-6">
          <div className="space-y-6 pt-4">
            <section className="bg-white rounded-lg border p-4 space-y-3">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
                Recevoir des notifications
              </h3>
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-gray-700">Pour ne manquer aucune mission :</p>
                <ul className="space-y-2.5">
                  <li className="flex items-start gap-2 text-sm leading-relaxed text-gray-700">
                    <ArrowRight className="h-4 w-4 mt-1 flex-shrink-0 text-gray-500" />
                    Cliquez sur "Activer les notifications"
                  </li>
                  <li className="flex items-start gap-2 text-sm leading-relaxed text-gray-700">
                    <ArrowRight className="h-4 w-4 mt-1 flex-shrink-0 text-gray-500" />
                    Acceptez la demande d'autorisation du navigateur
                  </li>
                  <li className="flex items-start gap-2 text-sm leading-relaxed text-gray-700">
                    <ArrowRight className="h-4 w-4 mt-1 flex-shrink-0 text-gray-500" />
                    Vous recevrez des notifications même lorsque le site est fermé
                  </li>
                </ul>
              </div>
            </section>

            <section className="bg-white rounded-lg border p-4 space-y-3">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                Gérer votre disponibilité
              </h3>
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-gray-700">Utilisez les boutons de statut pour indiquer votre disponibilité :</p>
                <ul className="space-y-2.5">
                  <li className="flex items-center gap-2.5 text-sm leading-relaxed text-gray-700">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                    <span className="font-medium">Disponible</span> - Vous pouvez recevoir des missions
                  </li>
                  <li className="flex items-center gap-2.5 text-sm leading-relaxed text-gray-700">
                    <div className="w-2.5 h-2.5 bg-orange-500 rounded-full"></div>
                    <span className="font-medium">En pause</span> - Temporairement indisponible
                  </li>
                  <li className="flex items-center gap-2.5 text-sm leading-relaxed text-gray-700">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                    <span className="font-medium">Indisponible</span> - Vous ne recevrez pas de missions
                  </li>
                  <li className="flex items-center gap-2.5 text-sm leading-relaxed text-gray-700">
                    <div className="w-2.5 h-2.5 bg-purple-500 rounded-full"></div>
                    <span className="font-medium">En appel</span> - Automatiquement défini lors d'une mission
                  </li>
                </ul>
              </div>
            </section>

            <section className="bg-white rounded-lg border p-4 space-y-3">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-purple-500 flex-shrink-0" />
                Gérer les missions
              </h3>
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-gray-700">Dans l'onglet "Missions" :</p>
                <ul className="space-y-2.5">
                  <li className="flex items-start gap-2 text-sm leading-relaxed text-gray-700">
                    <ArrowRight className="h-4 w-4 mt-1 flex-shrink-0 text-gray-500" />
                    Consultez les missions disponibles
                  </li>
                  <li className="flex items-start gap-2 text-sm leading-relaxed text-gray-700">
                    <ArrowRight className="h-4 w-4 mt-1 flex-shrink-0 text-gray-500" />
                    Acceptez ou déclinez les propositions
                  </li>
                  <li className="flex items-start gap-2 text-sm leading-relaxed text-gray-700">
                    <ArrowRight className="h-4 w-4 mt-1 flex-shrink-0 text-gray-500" />
                    Distinguez les missions immédiates des missions programmées
                  </li>
                </ul>
              </div>
            </section>

            <section className="bg-white rounded-lg border p-4 space-y-3">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                Gérer votre profil
              </h3>
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-gray-700">Dans l'onglet "Mon Profil" :</p>
                <ul className="space-y-2.5">
                  <li className="flex items-start gap-2 text-sm leading-relaxed text-gray-700">
                    <ArrowRight className="h-4 w-4 mt-1 flex-shrink-0 text-gray-500" />
                    Mettez à jour vos informations personnelles
                  </li>
                  <li className="flex items-start gap-2 text-sm leading-relaxed text-gray-700">
                    <ArrowRight className="h-4 w-4 mt-1 flex-shrink-0 text-gray-500" />
                    Gérez vos combinaisons de langues
                  </li>
                  <li className="flex items-start gap-2 text-sm leading-relaxed text-gray-700">
                    <ArrowRight className="h-4 w-4 mt-1 flex-shrink-0 text-gray-500" />
                    Ajoutez/modifiez votre photo de profil
                  </li>
                  <li className="flex items-start gap-2 text-sm leading-relaxed text-gray-700">
                    <ArrowRight className="h-4 w-4 mt-1 flex-shrink-0 text-gray-500" />
                    Consultez votre tarif d'interprétation
                  </li>
                </ul>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

