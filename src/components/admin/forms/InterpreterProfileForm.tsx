import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { PersonalSection } from "./sections/PersonalSection";
import { ProfessionalSection } from "./sections/ProfessionalSection";
import { WorkHoursSection } from "./sections/WorkHoursSection";
import { LanguagesSection } from "./sections/LanguagesSection";
import { PasswordSection } from "./sections/PasswordSection";
import { LanguagePair } from "@/types/languages";
import { EmploymentStatus } from "@/types/employment";

export interface InterpreterFormData {
  email: string;
  first_name: string;
  last_name: string;
  active: boolean;
  tarif_15min: number;
  tarif_5min: number;
  employment_status: EmploymentStatus;
  booth_number?: string;
  private_phone?: string;
  professional_phone?: string;
  work_hours?: {
    start_morning: string;
    end_morning: string;
    start_afternoon: string;
    end_afternoon: string;
  };
  languages: LanguagePair[];
  address?: {
    street: string;
    postal_code: string;
    city: string;
  };
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

  const form = useForm<InterpreterFormData>({
    defaultValues: {
      email: initialData?.email || "",
      first_name: initialData?.first_name || "",
      last_name: initialData?.last_name || "",
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
      languages: languages,
      address: initialData?.address || { street: "", postal_code: "", city: "" },
      phone_number: initialData?.phone_number || "",
      birth_country: initialData?.birth_country || "",
      nationality: initialData?.nationality || "",
      siret_number: initialData?.siret_number || "",
      vat_number: initialData?.vat_number || "",
      specializations: initialData?.specializations || [],
      landline_phone: initialData?.landline_phone || "",
    }
  });

  const handleSubmit = async (data: InterpreterFormData) => {
    setPasswordError("");
    
    if (password.trim()) {
      if (!confirmPassword.trim()) {
        setPasswordError("Veuillez confirmer le mot de passe");
        return;
      }
      if (password !== confirmPassword) {
        setPasswordError("Les mots de passe ne correspondent pas");
        return;
      }
    }
    
    const submissionData = {
      ...data,
      languages, // Make sure to include the languages state
      password: password.trim() || undefined,
    };

    await onSubmit(submissionData);
    
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <PersonalSection form={form} />
        <ProfessionalSection form={form} />
        <WorkHoursSection form={form} />
        <LanguagesSection languages={languages} onChange={setLanguages} />
        
        {!initialData && (
          <PasswordSection
            password={password}
            confirmPassword={confirmPassword}
            passwordError={passwordError}
            onPasswordChange={(value) => {
              setPassword(value);
              setPasswordError("");
            }}
            onConfirmPasswordChange={(value) => {
              setConfirmPassword(value);
              setPasswordError("");
            }}
          />
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
