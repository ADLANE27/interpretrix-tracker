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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LanguageSelector } from "@/components/interpreter/LanguageSelector";
import { LanguagePair } from "@/types/languages";
import { getWorkLocationOptions } from "@/utils/workLocationStatus";

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
  employment_status: "salaried_aft" | "salaried_aftcom" | "salaried_planet" | "self_employed" | "permanent_interpreter" | "permanent_interpreter_aftcom";
  booth_number?: string;
  private_phone?: string;
  professional_phone?: string;
  work_hours?: {
    start_morning: string;
    end_morning: string;
    start_afternoon: string;
    end_afternoon: string;
  };
  work_location: "remote" | "on_site";
  languages: LanguagePair[];
  address?: Address;
  phone_number?: string;
  birth_country?: string;
  nationality?: string;
  siret_number?: string;
  vat_number?: string;
  specializations?: string[];
  landline_phone?: string;
  password?: string;
}

interface InterpreterProfileFormProps {
  isEditing: boolean;
  onSubmit: (data: InterpreterFormData) => Promise<void>;
  initialData?: Partial<InterpreterFormData>;
  isSubmitting: boolean;
}

const employmentStatuses = [
  { value: "salaried_aft", label: "Salarié AFTrad" },
  { value: "salaried_aftcom", label: "Salarié AFTCOM" },
  { value: "salaried_planet", label: "Salarié PLANET" },
  { value: "permanent_interpreter", label: "Interprète permanent" },
  { value: "permanent_interpreter_aftcom", label: "Interprète Permanent AFTcom" },
  { value: "self_employed", label: "Externe" }
];

const workLocationOptions = getWorkLocationOptions();

export const InterpreterProfileForm = ({ 
  isEditing,
  onSubmit,
  initialData,
  isSubmitting 
}: InterpreterProfileFormProps) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  
  const initialLanguages = initialData?.languages || [];
  const [languages, setLanguages] = useState<LanguagePair[]>(initialLanguages);

  const defaultValues: InterpreterFormData = {
    email: initialData?.email || "",
    first_name: initialData?.first_name || "",
    last_name: initialData?.last_name || "",
    active: initialData?.active ?? true,
    tarif_15min: initialData?.tarif_15min || 0,
    tarif_5min: initialData?.tarif_5min || 0,
    employment_status: initialData?.employment_status || "salaried_aft",
    booth_number: initialData?.booth_number || "",
    private_phone: initialData?.private_phone || "",
    professional_phone: initialData?.professional_phone || "",
    work_hours: initialData?.work_hours || {
      start_morning: "09:00",
      end_morning: "13:00",
      start_afternoon: "14:00",
      end_afternoon: "17:00"
    },
    work_location: initialData?.work_location || "on_site",
    languages: languages,
    address: initialData?.address || { street: "", postal_code: "", city: "" },
    phone_number: initialData?.phone_number || "",
    birth_country: initialData?.birth_country || "",
    nationality: initialData?.nationality || "",
    siret_number: initialData?.siret_number || "",
    vat_number: initialData?.vat_number || "",
    specializations: initialData?.specializations || [],
    landline_phone: initialData?.landline_phone || "",
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
      languages: languages
    };

    await onSubmit(submissionData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle className="text-2xl">Informations personnelles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone mobile</FormLabel>
                    <FormControl>
                      <Input type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="landline_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone fixe</FormLabel>
                    <FormControl>
                      <Input type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="booth_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro de cabine</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: C12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="private_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone personnel</FormLabel>
                    <FormControl>
                      <Input type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="professional_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone professionnel</FormLabel>
                    <FormControl>
                      <Input type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address.street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rue</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="address.postal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code postal</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address.city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ville</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="birth_country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pays de naissance</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nationality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nationalité</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle className="text-2xl">Informations professionnelles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                      {employmentStatuses.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="work_location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lieu de travail</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un lieu de travail" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {workLocationOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="siret_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro SIRET</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vat_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro de TVA</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle>Horaires de travail</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Matin</Label>
                <div className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name="work_hours.start_morning"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <span>à</span>
                  <FormField
                    control={form.control}
                    name="work_hours.end_morning"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Après-midi</Label>
                <div className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name="work_hours.start_afternoon"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <span>à</span>
                  <FormField
                    control={form.control}
                    name="work_hours.end_afternoon"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle className="text-2xl">Langues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <LanguageSelector
                languages={languages}
                onChange={setLanguages}
                isEditing={true}
              />
            </div>
          </CardContent>
        </Card>

        {!initialData && (
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
            </CardContent>
          </Card>
        )}

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isSubmitting}
          onClick={(e) => {
            e.preventDefault();
            if (languages.length === 0) {
              form.setError("languages", {
                type: "manual",
                message: "Veuillez ajouter au moins une paire de langues"
              });
              return;
            }
            form.handleSubmit(handleSubmit)(e);
          }}
        >
          {isSubmitting ? "Enregistrement..." : initialData ? "Mettre à jour le profil" : "Créer l'interprète"}
        </Button>
      </form>
    </Form>
  );
};
