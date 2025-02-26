
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Languages } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { PrivateReservation } from "@/types/privateReservation";
import { Button } from "@/components/ui/button";

export const PrivateReservationList = () => {
  const [reservations, setReservations] = useState<PrivateReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchReservations = async () => {
    try {
      const { data, error } = await supabase
        .from('private_reservations')
        .select(`
          *,
          interpreter:interpreter_id (
            first_name,
            last_name,
            profile_picture_url
          )
        `)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setReservations(data as any);
    } catch (error) {
      console.error('[PrivateReservationList] Error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les réservations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('private_reservations')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `La réservation a été marquée comme ${newStatus === 'completed' ? 'terminée' : 'annulée'}`,
      });

      fetchReservations();
    } catch (error) {
      console.error('[PrivateReservationList] Error updating status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchReservations();

    const channel = supabase
      .channel('private-reservations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'private_reservations'
        },
        () => {
          console.log('[PrivateReservationList] Reservation update received');
          fetchReservations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Liste des réservations</h3>
      {reservations.length === 0 ? (
        <Card className="p-4">
          <p className="text-sm text-gray-500">Aucune réservation trouvée</p>
        </Card>
      ) : (
        reservations.map((reservation) => (
          <Card key={reservation.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">
                    {format(new Date(reservation.start_time), "d MMMM yyyy, HH:mm", { locale: fr })}
                    {" - "}
                    {format(new Date(reservation.end_time), "HH:mm", { locale: fr })}
                  </span>
                  <Badge variant="secondary">
                    {reservation.duration_minutes} min
                  </Badge>
                  <Badge 
                    variant={
                      reservation.status === 'scheduled' ? 'default' :
                      reservation.status === 'completed' ? 'secondary' :
                      'destructive'
                    }
                  >
                    {reservation.status === 'scheduled' ? 'Programmée' :
                     reservation.status === 'completed' ? 'Terminée' :
                     'Annulée'}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Languages className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    {reservation.source_language} → {reservation.target_language}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">
                    {(reservation as any).interpreter.first_name} {(reservation as any).interpreter.last_name}
                  </span>
                </div>

                {reservation.commentary && (
                  <p className="text-sm text-gray-500 mt-2">
                    {reservation.commentary}
                  </p>
                )}
              </div>

              {reservation.status === 'scheduled' && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(reservation.id, 'completed')}
                  >
                    Marquer comme terminée
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(reservation.id, 'cancelled')}
                  >
                    Annuler
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  );
};
