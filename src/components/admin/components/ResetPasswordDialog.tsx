import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { supabase } from "@/integrations/supabase/client";

interface ResetPasswordDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (password: string) => Promise<void>;
  isSubmitting: boolean;
  userData?: {
    email: string;
    first_name: string;
    role: 'admin' | 'interpreter';
    id: string;
  };
}

export const ResetPasswordDialog = ({
  isOpen,
  onOpenChange,
  onSubmit,
  isSubmitting,
  userData,
}: ResetPasswordDialogProps) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const resetForm = () => {
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async () => {
    if (password === confirmPassword) {
      try {
        await onSubmit(password);

        // Send email notification if we have user data
        if (userData) {
          const { error: emailError } = await supabase.functions.invoke('send-password-reset-email', {
            body: {
              email: userData.email,
              first_name: userData.first_name,
              role: userData.role,
              user_id: userData.id
            }
          });

          if (emailError) {
            console.error('Error sending password reset email:', emailError);
          }
        }

        resetForm();
      } catch (error) {
        // Error is handled by parent component
        resetForm();
      }
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
          <DialogDescription>
            Définissez un nouveau mot de passe pour l'utilisateur
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nouveau mot de passe</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label>Confirmer le mot de passe</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <Button 
            className="w-full"
            onClick={handleSubmit}
            disabled={isSubmitting || !password || !confirmPassword || password !== confirmPassword}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span>Mise à jour...</span>
              </div>
            ) : (
              "Mettre à jour"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
