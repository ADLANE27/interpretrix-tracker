
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, AlertCircle, ArrowRight, Info } from "lucide-react";

export interface HowToUseGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HowToUseGuide = ({ open, onOpenChange }: HowToUseGuideProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Guide Rapide</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[80vh] pr-4">
          <div className="space-y-6 py-4">
            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Statut de disponibilité
              </h3>
              <div className="ml-7">
                <p>En haut de votre écran, choisissez votre statut :</p>
                <ul className="list-disc ml-6 mt-2">
                  <li>🟢 <span className="font-medium">Disponible</span> - Prêt à recevoir des missions</li>
                  <li>🟡 <span className="font-medium">En pause</span> - Pause temporaire</li>
                  <li>🔴 <span className="font-medium">Indisponible</span> - Pas de missions</li>
                </ul>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-purple-500" />
                Navigation principale
              </h3>
              <div className="ml-7">
                <ul className="list-disc ml-6">
                  <li><span className="font-medium">Missions</span> - Voir et gérer vos missions</li>
                  <li><span className="font-medium">Messages</span> - Communiquer avec vos collègues</li>
                  <li><span className="font-medium">Profil</span> - Consulter vos informations</li>
                  <li><span className="font-medium">Calendrier</span> - Consulter vos missions réservées</li>
                </ul>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                Notifications
              </h3>
              <div className="ml-7">
                <p>Pour ne rien manquer :</p>
                <ul className="list-disc ml-6 mt-2">
                  <li>Gardez votre statut à jour</li>
                  <li>Activez les notifications du navigateur</li>
                  <li>Consultez régulièrement vos messages</li>
                </ul>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Besoin d'aide ?
              </h3>
              <div className="ml-7">
                <p>En cas de problème :</p>
                <ul className="list-disc ml-6 mt-2">
                  <li>Utilisez la messagerie pour contacter le support</li>
                  <li>Consultez votre responsable</li>
                </ul>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
