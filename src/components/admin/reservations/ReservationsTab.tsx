
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PrivateReservationForm } from "./PrivateReservationForm";
import { PrivateReservationList } from "./PrivateReservationList";

export const ReservationsTab = () => {
  return (
    <Tabs defaultValue="list" className="space-y-6">
      <TabsList>
        <TabsTrigger value="list">Liste des réservations</TabsTrigger>
        <TabsTrigger value="create">Créer une réservation</TabsTrigger>
      </TabsList>
      
      <TabsContent value="list">
        <PrivateReservationList />
      </TabsContent>
      
      <TabsContent value="create">
        <PrivateReservationForm />
      </TabsContent>
    </Tabs>
  );
};
