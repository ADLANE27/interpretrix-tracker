
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, BellRing, CalendarDays, MessageSquare, UserCog } from "lucide-react";

export const InterpreterGuideContent = () => {
  return (
    <div className="bg-background rounded-lg border p-6 shadow-sm">
      <h2 className="text-2xl font-bold mb-6">Guide d'utilisation - Espace Interprète</h2>
      <ScrollArea className="h-[calc(100vh-250px)] pr-4">
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Missions
            </h3>
            <div className="ml-7 space-y-2">
              <p>Dans l'onglet "Missions" :</p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Consultez les missions disponibles</li>
                <li>Acceptez ou refusez les nouvelles missions</li>
                <li>Suivez l'état de vos missions en cours</li>
                <li>Accédez à l'historique de vos missions</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-purple-500" />
              Calendrier
            </h3>
            <div className="ml-7 space-y-2">
              <p>Dans l'onglet "Calendrier" :</p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Visualisez vos missions programmées</li>
                <li>Gérez votre emploi du temps</li>
                <li>Planifiez vos disponibilités</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-yellow-500" />
              Messagerie
            </h3>
            <div className="ml-7 space-y-2">
              <p>Dans l'onglet "Messagerie" :</p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Communiquez avec l'équipe AFTraduction</li>
                <li>Recevez des notifications importantes</li>
                <li>Participez aux discussions de groupe</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <UserCog className="h-5 w-5 text-gray-500" />
              Mon Profil
            </h3>
            <div className="ml-7 space-y-2">
              <p>Dans l'onglet "Mon Profil" :</p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Mettez à jour vos informations personnelles</li>
                <li>Gérez vos paramètres de compte</li>
                <li>Modifiez vos tarifs et disponibilités</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BellRing className="h-5 w-5 text-green-500" />
              Notifications
            </h3>
            <div className="ml-7 space-y-2">
              <p>Gestion des notifications :</p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Activez les notifications pour ne manquer aucune mission</li>
                <li>Recevez des alertes pour les nouvelles missions</li>
                <li>Soyez informé des messages importants</li>
              </ul>
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
};
