
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PrivateReservation } from "@/types/privateReservation";
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

  // Convert UTC dates to local format for form inputs without any timezone adjustments
  const [startDate, setStartDate] = useState(reservation.start_time.split('T')[0]);
  const [startTime, setStartTime] = useState(reservation.start_time.split('T')[1].substring(0, 5));
  const [endDate, setEndDate] = useState(reservation.end_time.split('T')[0]);
  const [endTime, setEndTime] = useState(reservation.end_time.split('T')[1].substring(0, 5));

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
      // Create new Date objects using the form values directly
      const newStartTime = `${startDate}T${startTime}:00Z`;
      const newEndTime = `${endDate}T${endTime}:00Z`;
      
      // Calculate duration in minutes
      const startTimeMs = new Date(newStartTime).getTime();
      const endTimeMs = new Date(newEndTime).getTime();
      const durationMinutes = Math.round((endTimeMs - startTimeMs) / (1000 * 60));

      // First check if the new interpreter is available for this time slot
      if (selectedInterpreter !== reservation.interpreter_id) {
        const { data: isAvailable, error: availabilityError } = await supabase
          .rpc('check_interpreter_availability', {
            p_interpreter_id: selectedInterpreter,
            p_start_time: newStartTime,
            p_end_time: newEndTime,
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
          start_time: newStartTime,
          end_time: newEndTime,
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
