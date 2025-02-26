
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LANGUAGES } from "@/lib/constants";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const EditReservationDialog = ({ reservation, onReservationUpdated }: { 
  reservation: PrivateReservation, 
  onReservationUpdated: () => void 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [startTime, setStartTime] = useState(format(new Date(reservation.start_time), "yyyy-MM-dd'T'HH:mm"));
  const [endTime, setEndTime] = useState(format(new Date(reservation.end_time), "yyyy-MM-dd'T'HH:mm"));
  const [sourceLanguage, setSourceLanguage] = useState(reservation.source_language);
  const [targetLanguage, setTargetLanguage] = useState(reservation.target_language);
  const [commentary, setCommentary] = useState(reservation.commentary || '');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 1000 / 60);

      if (durationMinutes <= 0) {
        throw new Error("La date de fin doit être postérieure à la date de début");
      }

      const { error } = await supabase
        .from('private_reservations')
        .update({
          start_time: startTime,
          end_time: endTime,
          duration_minutes: durationMinutes,
          source_language: sourceLanguage,
          target_language: targetLanguage,
          commentary
        })
        .eq('id', reservation.id);

      if (error) throw error;

      toast({
        title: "Réservation mise à jour",
        description: "Les modifications ont été enregistrées avec succès"
      });

      onReservationUpdated();
      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4 mr-2" />
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la réservation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="startTime">Date et heure de début</label>
            <Input
              id="startTime"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="endTime">Date et heure de fin</label>
            <Input
              id="endTime"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label>Langue source</label>
            <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label>Langue cible</label>
            <Select value={targetLanguage} onValueChange={setTargetLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="commentary">Commentaire</label>
            <Textarea
              id="commentary"
              value={commentary}
              onChange={(e) => setCommentary(e.target.value)}
              placeholder="Ajouter un commentaire (optionnel)"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const PrivateReservationList = () => {
  const [reservations, setReservations] = useState<PrivateReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

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
      
      // Localize the dates to user's timezone
      const localizedData = (data as any).map((reservation: any) => ({
        ...reservation,
        start_time: formatInTimeZone(
          new Date(reservation.start_time),
          userTimeZone,
          "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"
        ),
        end_time: formatInTimeZone(
          new Date(reservation.end_time),
          userTimeZone,
          "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"
        )
      }));
      
      setReservations(localizedData);
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
                    {format(new Date(reservation.start_time), "d MMMM yyyy", { locale: fr })}
                    {", "}
                    {formatInTimeZone(new Date(reservation.start_time), userTimeZone, "HH:mm")}
                    {" - "}
                    {formatInTimeZone(new Date(reservation.end_time), userTimeZone, "HH:mm")}
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

              <div className="flex gap-2">
                <EditReservationDialog
                  reservation={reservation}
                  onReservationUpdated={fetchReservations}
                />
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
            </div>
          </Card>
        ))
      )}
    </div>
  );
};
