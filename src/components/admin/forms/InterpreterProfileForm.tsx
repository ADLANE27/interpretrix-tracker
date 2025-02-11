
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LanguageSelector, LanguagePair } from "@/components/interpreter/LanguageSelector";

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
  tarif_5min: number;
  employment_status: "salaried_aft" | "salaried_aftcom" | "salaried_planet" | "self_employed" | "permanent_interpreter";
  languages: LanguagePair[];
  address?: Address;
  password?: string;
}

interface InterpreterProfileFormProps {
  isEditing: boolean;
  onSubmit: (data: InterpreterFormData) => Promise<void>;
  initialData?: Partial<InterpreterFormData> & { languages?: string[] };
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
  
  // Convert string array to LanguagePair array
  const initialLanguages: LanguagePair[] = initialData?.languages?.map((lang: string) => {
    const parts = lang.split('→');
    return {
      source: parts[0]?.trim() || '',
      target: parts[1]?.trim() || ''
    };
  }).filter(lang => lang.source && lang.target) || [];

  const [languages, setLanguages] = useState<LanguagePair[]>(initialLanguages);

  const defaultValues: InterpreterFormData = {
    email: initialData?.email || "",
    first_name: initialData?.first_name || "",
    last_name: initialData?.last_name || "",
    active: initialData?.active ?? true,
    tarif_15min: initialData?.tarif_15min || 0,
    tarif_5min: initialData?.tarif_5min || 0,
    employment_status: initialData?.employment_status || "salaried_aft",
    languages: languages,
    address: initialData?.address,
    password: "",
  };

  const form = useForm<InterpreterFormData>({
    defaultValues,
  });

  const handleSubmit = async (data: InterpreterFormData) => {
    if (password && password !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas");
      return;
    }
    
    const submissionData: InterpreterFormData = {
      ...data,
      password: password || undefined,
      languages: languages // Use the languages from state
    };

    await onSubmit(submissionData);
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

        <FormField
          control={form.control}
          name="employment_status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Statut professionnel</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un statut" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="salaried_aft">Salarié AFTrad</SelectItem>
                  <SelectItem value="salaried_aftcom">Salarié AFTCOM</SelectItem>
                  <SelectItem value="salaried_planet">Salarié PLANET</SelectItem>
                  <SelectItem value="permanent_interpreter">Interprète permanent</SelectItem>
                  <SelectItem value="self_employed">Auto-entrepreneur</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <Label>Langues</Label>
          <LanguageSelector
            languages={languages}
            onChange={setLanguages}
            isEditing={true}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tarif_15min"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tarif (15 minutes)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0" 
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tarif_5min"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tarif (5 minutes)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0" 
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
