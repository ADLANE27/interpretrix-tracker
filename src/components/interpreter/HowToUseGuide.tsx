
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
          className="flex-1 sm:flex-none"
          title="Guide d'utilisation"
        >
          <BookOpen className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl h-[95vh] sm:h-[90vh] flex flex-col p-0 fixed top-[2.5vh] sm:top-[5vh]">
        <DialogHeader className="p-4 sm:p-6 pb-2 border-b bg-white flex justify-between items-center sticky top-0 z-50">
          <DialogTitle className="text-xl sm:text-2xl font-bold pr-8">
            Guide d'utilisation
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 rounded-full hover:bg-gray-100"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-6">
            <section className="space-y-4">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                Gérer votre disponibilité
              </h3>
              <div className="ml-7 space-y-3">
                <p className="text-sm sm:text-base">Utilisez les boutons de statut pour indiquer votre disponibilité :</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <ul className="space-y-3 text-sm sm:text-base">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium">Disponible</span> - Vous pouvez recevoir des missions
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="font-medium">En pause</span> - Temporairement indisponible
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="font-medium">Indisponible</span> - Vous ne recevrez pas de missions
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="font-medium">En appel</span> - Automatiquement défini lors d'une mission
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                Recevoir des notifications
              </h3>
              <div className="ml-7 space-y-3">
                <p className="text-sm sm:text-base">Pour ne manquer aucune mission :</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <ul className="space-y-2 text-sm sm:text-base">
                    <li className="flex items-start gap-2">
                      <ArrowRight className="h-4 w-4 mt-1 flex-shrink-0" />
                      Cliquez sur "Activer les notifications"
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="h-4 w-4 mt-1 flex-shrink-0" />
                      Acceptez la demande d'autorisation du navigateur
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="h-4 w-4 mt-1 flex-shrink-0" />
                      Vous recevrez des notifications même lorsque le site est fermé
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-purple-500 flex-shrink-0" />
                Gérer les missions
              </h3>
              <div className="ml-7 space-y-3">
                <p className="text-sm sm:text-base">Dans l'onglet "Missions" :</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <ul className="space-y-2 text-sm sm:text-base">
                    <li className="flex items-start gap-2">
                      <ArrowRight className="h-4 w-4 mt-1 flex-shrink-0" />
                      Consultez les missions disponibles
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="h-4 w-4 mt-1 flex-shrink-0" />
                      Acceptez ou déclinez les propositions
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="h-4 w-4 mt-1 flex-shrink-0" />
                      Distinguez les missions immédiates des missions programmées
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <Info className="h-5 w-5 text-orange-500 flex-shrink-0" />
                Gérer votre profil
              </h3>
              <div className="ml-7 space-y-3">
                <p className="text-sm sm:text-base">Dans l'onglet "Mon Profil" :</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <ul className="space-y-2 text-sm sm:text-base">
                    <li className="flex items-start gap-2">
                      <ArrowRight className="h-4 w-4 mt-1 flex-shrink-0" />
                      Mettez à jour vos informations personnelles
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="h-4 w-4 mt-1 flex-shrink-0" />
                      Gérez vos combinaisons de langues
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="h-4 w-4 mt-1 flex-shrink-0" />
                      Ajoutez/modifiez votre photo de profil
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="h-4 w-4 mt-1 flex-shrink-0" />
                      Consultez votre tarif d'interprétation
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
