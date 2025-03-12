
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PasswordSectionProps {
  password: string;
  confirmPassword: string;
  passwordError: string;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
}

export const PasswordSection = ({
  password,
  confirmPassword,
  passwordError,
  onPasswordChange,
  onConfirmPasswordChange,
}: PasswordSectionProps) => {
  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-2xl">Mot de passe</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Mot de passe (optionnel)</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="Laissez vide pour générer automatiquement"
          />
        </div>

        {password.trim() && (
          <div className="space-y-2">
            <Label>Confirmer le mot de passe</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
            />
            {passwordError && (
              <p className="text-sm font-medium text-destructive">{passwordError}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
