import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LANGUAGES } from "@/lib/constants";
import { Pencil } from "lucide-react";
import { Mission } from "@/types/mission";

interface EditMissionDialogProps {
  mission: Mission;
  onMissionUpdated: () => void;
}

export const EditMissionDialog = ({ mission, onMissionUpdated }: EditMissionDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [startTime, setStartTime] = useState(mission.scheduled_start_time || "");
  const [endTime, setEndTime] = useState(mission.scheduled_end_time || "");
  const [sourceLanguage, setSourceLanguage] = useState(mission.source_language);
  const [targetLanguage, setTargetLanguage] = useState(mission.target_language);
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
        .from('interpretation_missions')
        .update({
          scheduled_start_time: startTime,
          scheduled_end_time: endTime,
          estimated_duration: durationMinutes,
          source_language: sourceLanguage,
          target_language: targetLanguage
        })
        .eq('id', mission.id);

      if (error) throw error;

      toast({
        title: "Mission mise à jour",
        description: "Les modifications ont été enregistrées avec succès"
      });

      onMissionUpdated();
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
          <DialogTitle>Modifier la mission</DialogTitle>
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
