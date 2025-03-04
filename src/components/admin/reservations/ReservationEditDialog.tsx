import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PrivateReservation } from "@/types/privateReservation";
import { format } from "date-fns";

interface ReservationEditDialogProps {
  reservation: PrivateReservation;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReservationEditDialog = ({
  reservation,
  onClose,
  onSuccess,
}: ReservationEditDialogProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize form state with direct date values
  const [startDate, setStartDate] = useState(format(new Date(reservation.start_time), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(format(new Date(reservation.start_time), "HH:mm"));
  const [endDate, setEndDate] = useState(format(new Date(reservation.end_time), "yyyy-MM-dd"));
  const [endTime, setEndTime] = useState(format(new Date(reservation.end_time), "HH:mm"));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const newStartTime = new Date(`${startDate}T${startTime}`);
      const newEndTime = new Date(`${endDate}T${endTime}`);
      
      // Calculate duration in minutes
      const durationMinutes = Math.round((newEndTime.getTime() - newStartTime.getTime()) / (1000 * 60));

      const { error } = await supabase
        .from('private_reservations')
        .update({
          start_time: newStartTime.toISOString(),
          end_time: newEndTime.toISOString(),
          duration_minutes: durationMinutes
        })
        .eq('id', reservation.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "La réservation a été mise à jour",
      });

      onSuccess();
    } catch (error) {
      console.error('[ReservationEditDialog] Error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la réservation",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => !isSubmitting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la réservation</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Date de début</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-time">Heure de début</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">Date de fin</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">Heure de fin</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Mise à jour..." : "Mettre à jour"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
