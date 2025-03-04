import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Languages, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { PrivateReservation } from "@/types/privateReservation";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ReservationEditDialog } from "./ReservationEditDialog";

interface PrivateReservationListProps {
  nameFilter: string;
  sourceLanguageFilter: string;
  targetLanguageFilter: string;
  startDateFilter: string;
  endDateFilter: string;
}

export const PrivateReservationList = ({
  nameFilter,
  sourceLanguageFilter,
  targetLanguageFilter,
  startDateFilter,
  endDateFilter
}: PrivateReservationListProps) => {
  const [reservations, setReservations] = useState<PrivateReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [selectedReservation, setSelectedReservation] = useState<PrivateReservation | null>(null);

  const adjustForFrenchTime = (dateString: string) => {
    const date = new Date(dateString);
    return addHours(date, -1);
  };

  const fetchReservations = async () => {
    try {
      const { data, error } = await supabase
        .from('private_reservations')
        .select(`
          *,
          interpreter_profiles:interpreter_profiles!private_reservations_interpreter_id_fkey (
            first_name,
            last_name,
            profile_picture_url
          )
        `)
        .order('start_time', { ascending: true });

      if (error) throw error;
      
      setReservations(data || []);
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

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('private_reservations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "La réservation a été supprimée",
      });

      fetchReservations();
    } catch (error) {
      console.error('[PrivateReservationList] Error deleting reservation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la réservation",
        variant: "destructive",
      });
    }
  };

  const formatDateTime = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: fr });
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

  const filteredReservations = reservations.filter(reservation => {
    const interpreter = reservation.interpreter_profiles;
    if (!interpreter) return false;
    
    const interpreterName = `${interpreter.first_name} ${interpreter.last_name}`.toLowerCase();
    const matchesName = nameFilter === "" || interpreterName.includes(nameFilter.toLowerCase());
    
    const matchesSourceLanguage = sourceLanguageFilter === "all" || 
      reservation.source_language === sourceLanguageFilter;
    
    const matchesTargetLanguage = targetLanguageFilter === "all" || 
      reservation.target_language === targetLanguageFilter;

    const reservationDate = new Date(reservation.start_time);
    const startDate = startDateFilter ? new Date(startDateFilter) : null;
    const endDate = endDateFilter ? new Date(endDateFilter) : null;

    const matchesDateRange = 
      (!startDate || reservationDate >= startDate) &&
      (!endDate || reservationDate <= endDate);

    return matchesName && matchesSourceLanguage && matchesTargetLanguage && matchesDateRange;
  });

  const handleEditSuccess = () => {
    fetchReservations();
    setSelectedReservation(null);
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Liste des réservations</h3>
      {filteredReservations.length === 0 ? (
        <Card className="p-4">
          <p className="text-sm text-gray-500">Aucune réservation trouvée</p>
        </Card>
      ) : (
        filteredReservations.map((reservation) => (
          <Card key={reservation.id} className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">
                {formatDateTime(reservation.start_time)}
                {" - "}
                {format(new Date(reservation.end_time), 'HH:mm', { locale: fr })}
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
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-green-500" />
                <span className="text-sm">
                  {reservation.source_language} → {reservation.target_language}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">
                  {reservation.interpreter_profiles?.first_name} {reservation.interpreter_profiles?.last_name}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedReservation(reservation)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Modifier
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer la réservation</AlertDialogTitle>
                    <AlertDialogDescription>
                      Êtes-vous sûr de vouloir supprimer cette réservation ? Cette action est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(reservation.id)}>
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
      
      {selectedReservation && (
        <ReservationEditDialog
          reservation={selectedReservation}
          onClose={() => setSelectedReservation(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
};
