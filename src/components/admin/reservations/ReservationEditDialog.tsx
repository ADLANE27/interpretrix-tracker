
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PrivateReservation } from "@/types/privateReservation";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ReservationEditDialogProps {
  reservation: PrivateReservation;
  onClose: () => void;
  onSuccess: () => void;
}

interface Interpreter {
  id: string;
  first_name: string;
  last_name: string;
}

export const ReservationEditDialog = ({
  reservation,
  onClose,
  onSuccess,
}: ReservationEditDialogProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [interpreters, setInterpreters] = useState<Interpreter[]>([]);
  const [selectedInterpreter, setSelectedInterpreter] = useState(reservation.interpreter_id);
  
  const [startDate, setStartDate] = useState(format(new Date(reservation.start_time), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(format(new Date(reservation.start_time), "HH:mm"));
  const [endDate, setEndDate] = useState(format(new Date(reservation.end_time), "yyyy-MM-dd"));
  const [endTime, setEndTime] = useState(format(new Date(reservation.end_time), "HH:mm"));

  useEffect(() => {
    const fetchEligibleInterpreters = async () => {
      try {
        const { data: interpreterData, error } = await supabase
          .from('interpreter_profiles')
          .select('id, first_name, last_name, languages')
          .filter('languages', 'cs', `{${reservation.source_language}→${reservation.target_language}}`);

        if (error) throw error;

        setInterpreters(interpreterData || []);
      } catch (error) {
        console.error('[ReservationEditDialog] Error fetching interpreters:', error);
      }
    };

    fetchEligibleInterpreters();
  }, [reservation.source_language, reservation.target_language]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const newStartTime = new Date(`${startDate}T${startTime}`);
      const newEndTime = new Date(`${endDate}T${endTime}`);
      
      // Calculate duration in minutes
      const durationMinutes = Math.round((newEndTime.getTime() - newStartTime.getTime()) / (1000 * 60));

      // First check if the new interpreter is available for this time slot
      if (selectedInterpreter !== reservation.interpreter_id) {
        const { data: isAvailable, error: availabilityError } = await supabase
          .rpc('check_interpreter_availability', {
            p_interpreter_id: selectedInterpreter,
            p_start_time: newStartTime.toISOString(),
            p_end_time: newEndTime.toISOString(),
            p_exclude_reservation_id: reservation.id
          });

        if (availabilityError) throw availabilityError;

        if (!isAvailable) {
          throw new Error("L'interprète sélectionné n'est pas disponible pour ce créneau");
        }
      }

      const { error } = await supabase
        .from('private_reservations')
        .update({
          start_time: newStartTime.toISOString(),
          end_time: newEndTime.toISOString(),
          duration_minutes: durationMinutes,
          interpreter_id: selectedInterpreter
        })
        .eq('id', reservation.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "La réservation a été mise à jour",
      });

      onSuccess();
    } catch (error: any) {
      console.error('[ReservationEditDialog] Error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour la réservation",
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

          <div className="space-y-2">
            <Label htmlFor="interpreter">Interprète</Label>
            <Select value={selectedInterpreter} onValueChange={setSelectedInterpreter}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un interprète" />
              </SelectTrigger>
              <SelectContent>
                {interpreters.map((interpreter) => (
                  <SelectItem key={interpreter.id} value={interpreter.id}>
                    {interpreter.first_name} {interpreter.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

