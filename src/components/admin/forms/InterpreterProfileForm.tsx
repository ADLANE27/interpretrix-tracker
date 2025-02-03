import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LanguagePair {
  source: string;
  target: string;
}

interface Address {
  street: string;
  postal_code: string;
  city: string;
}

export interface InterpreterFormData {
  email: string;
  first_name: string;
  last_name: string;
  active: boolean;
  tarif_15min: number;
  employment_status?: "salaried" | "self_employed";
  languages: LanguagePair[];
  address?: Address;
  password?: string;
}

interface InterpreterProfileFormProps {
  isEditing: boolean;
  onSubmit: (data: InterpreterFormData) => Promise<void>;
  initialData?: InterpreterFormData;
  isSubmitting: boolean;
}

export const InterpreterProfileForm = ({ 
  isEditing,
  onSubmit,
  initialData,
  isSubmitting 
}: InterpreterProfileFormProps) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const form = useForm<InterpreterFormData>({
    defaultValues: initialData || {
      email: "",
      first_name: "",
      last_name: "",
      active: true,
      tarif_15min: 0,
      employment_status: undefined,
      languages: [],
      address: undefined,
      password: "",
    },
  });

  const handleSubmit = async (data: InterpreterFormData) => {
    if (password && password !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas");
      return;
    }
    if (password) {
      data.password = password;
    }
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="interpreter@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="first_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prénom</FormLabel>
              <FormControl>
                <Input placeholder="Jean" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="last_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom</FormLabel>
              <FormControl>
                <Input placeholder="Dupont" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!initialData && (
          <>
            <div className="space-y-2">
              <Label>Mot de passe (optionnel)</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError("");
                }}
                placeholder="Laissez vide pour générer automatiquement"
              />
            </div>

            {password && (
              <div className="space-y-2">
                <Label>Confirmer le mot de passe</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordError("");
                  }}
                />
                {passwordError && (
                  <p className="text-sm font-medium text-destructive">{passwordError}</p>
                )}
              </div>
            )}
          </>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Mise à jour..." : "Mettre à jour l'interprète"}
        </Button>
      </form>
    </Form>
  );
};