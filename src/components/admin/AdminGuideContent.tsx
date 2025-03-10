
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserCog, Clock, Bell, CheckCircle, Settings, Calendar, MessageSquare, Search, Shield, PhoneCall } from "lucide-react";

export const AdminGuideContent = () => {
  return (
    <div className="bg-background rounded-lg border shadow-sm h-[calc(100vh-100px)] overflow-hidden">
      <ScrollArea>
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Guide d'Administration Détaillé</h2>
          <div className="space-y-8">
            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <UserCog className="h-5 w-5 text-blue-500" />
                Gestion des Interprètes
              </h3>
              <div className="ml-7 space-y-4">
                <div>
                  <p className="font-medium">Dans la liste des interprètes :</p>
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Voyez tous les interprètes et leur statut en temps réel (disponible, en pause, en appel...)</li>
                    <li>Utilisez les filtres pour trouver rapidement un interprète par nom ou langue</li>
                    <li>Consultez les détails de chaque profil en cliquant dessus</li>
                    <li>Modifiez les informations si nécessaire</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Pour ajouter un nouvel interprète :</p>
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Cliquez sur "Ajouter un interprète"</li>
                    <li>Remplissez toutes les informations requises</li>
                    <li>Un email d'invitation sera automatiquement envoyé</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <PhoneCall className="h-5 w-5 text-purple-500" />
                Gestion des Missions
              </h3>
              <div className="ml-7 space-y-4">
                <div>
                  <p className="font-medium">Pour les missions immédiates :</p>
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Créez rapidement une mission en choisissant les langues</li>
                    <li>Le système trouvera automatiquement les interprètes disponibles</li>
                    <li>Suivez l'état de la mission en temps réel</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Pour les missions programmées :</p>
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Utilisez le calendrier pour planifier à l'avance</li>
                    <li>Choisissez la date, l'heure et la durée</li>
                    <li>Sélectionnez un interprète spécifique si nécessaire</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Suivi des missions :</p>
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Visualisez toutes les missions en cours et à venir</li>
                    <li>Gérez les annulations ou modifications si nécessaire</li>
                    <li>Consultez l'historique complet</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-500" />
                Calendrier et Réservations
              </h3>
              <div className="ml-7 space-y-4">
                <div>
                  <p className="font-medium">Vue du calendrier :</p>
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Affichez les missions par jour, semaine ou mois</li>
                    <li>Voyez rapidement qui est assigné à chaque mission</li>
                    <li>Gérez les réservations privées des interprètes</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Réservations privées :</p>
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Créez des réservations pour bloquer du temps</li>
                    <li>Modifiez ou annulez les réservations existantes</li>
                    <li>Évitez les conflits d'horaires</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-yellow-500" />
                Communication
              </h3>
              <div className="ml-7 space-y-4">
                <div>
                  <p className="font-medium">Messages et notifications :</p>
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Envoyez des messages à un ou plusieurs interprètes</li>
                    <li>Créez des canaux de discussion pour différents sujets</li>
                    <li>Suivez qui a lu les messages importants</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Annonces importantes :</p>
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Diffusez des informations à tous les interprètes</li>
                    <li>Envoyez des notifications d'urgence</li>
                    <li>Gardez une trace des communications</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-500" />
                Gestion des Accès
              </h3>
              <div className="ml-7 space-y-4">
                <div>
                  <p className="font-medium">Gestion des comptes :</p>
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Créez des comptes administrateurs</li>
                    <li>Gérez les droits d'accès</li>
                    <li>Réinitialisez les mots de passe si nécessaire</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Sécurité :</p>
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Surveillez les connexions suspectes</li>
                    <li>Désactivez temporairement des comptes</li>
                    <li>Gérez les sessions actives</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

