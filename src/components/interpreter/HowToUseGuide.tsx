
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, AlertCircle, ArrowRight, Info, Calendar, MessageSquare, Clock, User, Languages, Phone } from "lucide-react";

export interface HowToUseGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HowToUseGuide = ({ open, onOpenChange }: HowToUseGuideProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Guide d'Utilisation</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[80vh] pr-4">
          <div className="space-y-6 py-4">
            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Votre Statut de Disponibilité
              </h3>
              <div className="ml-7">
                <p>En haut de votre écran, vous pouvez indiquer si vous êtes disponible ou non :</p>
                <ul className="list-disc ml-6 mt-2 space-y-2">
                  <li><span className="font-medium text-green-600">Disponible</span> - Vous êtes prêt(e) à recevoir des missions. Choisissez ce statut quand vous commencez votre journée.</li>
                  <li><span className="font-medium text-yellow-600">En pause</span> - Vous faites une courte pause (déjeuner, café...). N'oubliez pas de repasser en "Disponible" après.</li>
                  <li><span className="font-medium text-blue-600">En appel</span> - Ce statut se met automatiquement quand vous êtes en mission d'interprétariat.</li>
                  <li><span className="font-medium text-red-600">Indisponible</span> - Vous n'êtes pas en service. À utiliser en fin de journée ou lors d'absences.</li>
                </ul>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-purple-500" />
                Les Sections Principales
              </h3>
              <div className="ml-7 space-y-4">
                <div>
                  <p className="flex items-center gap-2 font-medium">
                    <Clock className="h-4 w-4" />
                    Missions
                  </p>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Voyez toutes vos missions du jour</li>
                    <li>Acceptez ou refusez les nouvelles demandes</li>
                    <li>Consultez les détails : langues, durée, client</li>
                  </ul>
                </div>

                <div>
                  <p className="flex items-center gap-2 font-medium">
                    <Calendar className="h-4 w-4" />
                    Calendrier
                  </p>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Vue d'ensemble de vos missions programmées</li>
                    <li>Planifiez votre emploi du temps</li>
                    <li>Gérez vos réservations privées</li>
                  </ul>
                </div>

                <div>
                  <p className="flex items-center gap-2 font-medium">
                    <MessageSquare className="h-4 w-4" />
                    Messages
                  </p>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Discutez avec vos collègues et l'administration</li>
                    <li>Recevez les informations importantes</li>
                    <li>Posez vos questions</li>
                  </ul>
                </div>

                <div>
                  <p className="flex items-center gap-2 font-medium">
                    <User className="h-4 w-4" />
                    Profil
                  </p>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Mettez à jour vos informations personnelles</li>
                    <li>Gérez vos langues de travail</li>
                    <li>Consultez votre historique</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Phone className="h-5 w-5 text-blue-500" />
                Comment Gérer une Mission
              </h3>
              <div className="ml-7">
                <ol className="list-decimal ml-6 space-y-3">
                  <li>
                    <p className="font-medium">Quand une mission arrive :</p>
                    <ul className="list-disc ml-6 mt-1">
                      <li>Vous recevez une notification</li>
                      <li>La mission apparaît dans votre liste</li>
                      <li>Vérifiez les langues et la durée</li>
                    </ul>
                  </li>
                  <li>
                    <p className="font-medium">Pour accepter une mission :</p>
                    <ul className="list-disc ml-6 mt-1">
                      <li>Cliquez sur le bouton "Accepter"</li>
                      <li>La mission est maintenant réservée pour vous</li>
                      <li>Attendez l'appel du client</li>
                    </ul>
                  </li>
                  <li>
                    <p className="font-medium">Pendant la mission :</p>
                    <ul className="list-disc ml-6 mt-1">
                      <li>Votre statut passe automatiquement à "En appel"</li>
                      <li>Les autres missions sont mises en pause</li>
                    </ul>
                  </li>
                </ol>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                Conseils Importants
              </h3>
              <div className="ml-7">
                <ul className="list-disc ml-6 space-y-2">
                  <li>Gardez votre navigateur ouvert pendant vos heures de travail</li>
                  <li>Activez les notifications dans votre navigateur pour ne rien manquer</li>
                  <li>Vérifiez régulièrement vos messages</li>
                  <li>N'oubliez pas de mettre votre statut à jour</li>
                </ul>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Besoin d'Aide ?
              </h3>
              <div className="ml-7">
                <p>Si vous rencontrez des difficultés :</p>
                <ul className="list-disc ml-6 mt-2">
                  <li>Utilisez la messagerie pour contacter le support</li>
                  <li>Appelez votre responsable</li>
                  <li>Expliquez clairement votre problème</li>
                </ul>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
