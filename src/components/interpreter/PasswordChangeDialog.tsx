
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface PasswordChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPasswordChanged: () => void;
}

export const PasswordChangeDialog = ({ open, onOpenChange, onPasswordChanged }: PasswordChangeDialogProps) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      const { error: profileError } = await supabase
        .from('interpreter_profiles')
        .update({ password_changed: true })
        .eq('id', user.id);

      if (profileError) throw profileError;

      onOpenChange(false);
      setNewPassword("");
      setConfirmPassword("");
      
      toast({
        title: "Mot de passe mis à jour",
        description: "Votre mot de passe a été mis à jour avec succès",
      });
      
      onPasswordChanged();
    } catch (error) {
      console.error("Error updating password:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour votre mot de passe",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Changer votre mot de passe</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button 
            className="w-full" 
            onClick={handlePasswordChange}
            disabled={isSubmitting || !newPassword || !confirmPassword}
          >
            {isSubmitting ? "Mise à jour..." : "Mettre à jour le mot de passe"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
