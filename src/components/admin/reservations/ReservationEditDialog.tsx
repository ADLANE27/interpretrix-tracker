
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PrivateReservation, CompanyType } from "@/types/privateReservation";
import { COMPANY_TYPES, LANGUAGES } from "@/lib/constants";

interface ReservationEditDialogProps {
  reservation: PrivateReservation;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReservationEditDialog = ({
  reservation,
  onClose,
  onSuccess
}: ReservationEditDialogProps) => {
  const [sourceLanguage, setSourceLanguage] = useState(reservation.source_language);
  const [targetLanguage, setTargetLanguage] = useState(reservation.target_language);
  const [startTime, setStartTime] = useState(reservation.start_time.slice(0, 16));
  const [endTime, setEndTime] = useState(reservation.end_time.slice(0, 16));
  const [commentary, setCommentary] = useState(reservation.commentary || "");
  const [company, setCompany] = useState<CompanyType>(reservation.company);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleUpdateReservation = async () => {
    if (!startTime || !endTime || !sourceLanguage || !targetLanguage) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));

      const { error } = await supabase
        .from('private_reservations')
        .update({
          source_language: sourceLanguage,
          target_language: targetLanguage,
          start_time: startTime,
          end_time: endTime,
          duration_minutes: durationMinutes,
          commentary,
          company
        })
        .eq('id', reservation.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "La réservation a été mise à jour",
      });

      onSuccess();
    } catch (error: any) {
      console.error('[ReservationEditDialog] Error updating reservation:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour la réservation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Modifier la réservation</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-source-language">Langue source</Label>
              <Select 
                value={sourceLanguage} 
                onValueChange={setSourceLanguage}
              >
                <SelectTrigger id="edit-source-language">
                  <SelectValue placeholder="Sélectionner une langue" />
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
              <Label htmlFor="edit-target-language">Langue cible</Label>
              <Select 
                value={targetLanguage} 
                onValueChange={setTargetLanguage}
              >
                <SelectTrigger id="edit-target-language">
                  <SelectValue placeholder="Sélectionner une langue" />
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-start-time">Date et heure de début</Label>
              <Input
                type="datetime-local"
                id="edit-start-time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-end-time">Date et heure de fin</Label>
              <Input
                type="datetime-local"
                id="edit-end-time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                min={startTime}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-company">Entreprise</Label>
            <Select 
              value={company} 
              onValueChange={(value: CompanyType) => setCompany(value)}
            >
              <SelectTrigger id="edit-company">
                <SelectValue placeholder="Sélectionner une entreprise" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={COMPANY_TYPES.AFTRAD}>AFTrad</SelectItem>
                <SelectItem value={COMPANY_TYPES.AFTCOM}>AFTcom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-commentary">Commentaire (optionnel)</Label>
            <Textarea
              id="edit-commentary"
              value={commentary}
              onChange={(e) => setCommentary(e.target.value)}
              placeholder="Ajouter un commentaire..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button 
            onClick={handleUpdateReservation}
            disabled={isLoading}
          >
            {isLoading ? "Mise à jour..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
