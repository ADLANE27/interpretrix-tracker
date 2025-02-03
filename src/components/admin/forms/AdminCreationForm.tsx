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

export interface AdminFormData {
  email: string;
  first_name: string;
  last_name: string;
  password?: string;
}

interface AdminCreationFormProps {
  onSubmit: (data: AdminFormData) => Promise<void>;
  isSubmitting: boolean;
}

export const AdminCreationForm = ({ onSubmit, isSubmitting }: AdminCreationFormProps) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const form = useForm<AdminFormData>({
    defaultValues: {
      email: "",
      first_name: "",
      last_name: "",
      password: "",
    },
  });

  const handleSubmit = async (data: AdminFormData) => {
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
                <Input type="email" placeholder="admin@example.com" {...field} />
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

        <div className="space-y-2">
          <FormItem>
            <FormLabel>Mot de passe (optionnel)</FormLabel>
            <FormControl>
              <Input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError("");
                }}
                placeholder="Laissez vide pour générer automatiquement"
              />
            </FormControl>
          </FormItem>
        </div>

        {password && (
          <div className="space-y-2">
            <FormItem>
              <FormLabel>Confirmer le mot de passe</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordError("");
                  }}
                />
              </FormControl>
              {passwordError && (
                <p className="text-sm font-medium text-destructive">{passwordError}</p>
              )}
            </FormItem>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Création en cours..." : "Créer l'administrateur"}
        </Button>
      </form>
    </Form>
  );
};