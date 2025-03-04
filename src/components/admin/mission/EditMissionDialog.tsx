
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
import { toZonedTime, format } from "date-fns-tz";
import { fr } from "date-fns/locale";

interface EditMissionDialogProps {
  mission: Mission;
  onMissionUpdated: () => void;
}

export const EditMissionDialog = ({ mission, onMissionUpdated }: EditMissionDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState(mission.source_language);
  const [targetLanguage, setTargetLanguage] = useState(mission.target_language);
  const { toast } = useToast();

  // Convert UTC ISO string to French timezone datetime-local string
  const toFrenchTime = (isoString: string | null) => {
    if (!isoString) return "";
    
    // Convert UTC to Europe/Paris timezone
    const zonedTime = toZonedTime(new Date(isoString), 'Europe/Paris');
    
    // Format for datetime-local input (YYYY-MM-DDThh:mm)
    const formattedTime = format(zonedTime, "yyyy-MM-dd'T'HH:mm", { timeZone: 'Europe/Paris' });
    console.log('Converting to French time:', { 
      input: isoString,
      output: formattedTime,
      zoned: zonedTime
    });
    
    return formattedTime;
  };

  // Convert French timezone datetime-local string back to UTC ISO string
  const toUTCTime = (localString: string) => {
    // Create a date object treating the input as Europe/Paris time
    const date = new Date(localString);
    
    // Adjust for timezone offset to get correct UTC time
    const utcString = new Date(
      date.getTime() - (date.getTimezoneOffset() * 60000)
    ).toISOString();

    console.log('Converting to UTC:', {
      input: localString,
      output: utcString,
      timezoneOffset: date.getTimezoneOffset()
    });

    return utcString;
  };

  const handleDialogOpen = (open: boolean) => {
    if (open) {
      // When opening the dialog, convert mission times from UTC to French time
      if (mission.scheduled_start_time) {
        const frenchStartTime = toFrenchTime(mission.scheduled_start_time);
        console.log('Setting initial start time:', { 
          original: mission.scheduled_start_time,
          converted: frenchStartTime 
        });
        setStartTime(frenchStartTime);
      }
      if (mission.scheduled_end_time) {
        const frenchEndTime = toFrenchTime(mission.scheduled_end_time);
        console.log('Setting initial end time:', { 
          original: mission.scheduled_end_time,
          converted: frenchEndTime 
        });
        setEndTime(frenchEndTime);
      }
    }
    setIsOpen(open);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Convert local times back to UTC for database storage
      const utcStartTime = toUTCTime(startTime);
      const utcEndTime = toUTCTime(endTime);
      
      console.log('Submitting mission update:', {
        startTime: { local: startTime, utc: utcStartTime },
        endTime: { local: endTime, utc: utcEndTime }
      });

      const { error } = await supabase
        .from('interpretation_missions')
        .update({
          scheduled_start_time: utcStartTime,
          scheduled_end_time: utcEndTime,
          source_language: sourceLanguage,
          target_language: targetLanguage,
          estimated_duration: Math.round(
            (new Date(utcEndTime).getTime() - new Date(utcStartTime).getTime()) / 1000 / 60
          )
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
      console.error('Error updating mission:', error);
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
    <Dialog open={isOpen} onOpenChange={handleDialogOpen}>
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
