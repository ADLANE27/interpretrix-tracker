import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CountrySelect } from "@/components/CountrySelect";
import { LanguageSelector } from "@/components/interpreter/LanguageSelector";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LanguagePair } from "@/types/interpreter";
import type { Json } from "@/integrations/supabase/types";

interface Address {
  street: string;
  postal_code: string;
  city: string;
}

interface InterpreterProfileFormProps {
  isEditing: boolean;
  onSubmit: (data: InterpreterFormData) => void;
  initialData?: Partial<InterpreterFormData>;
  isSubmitting?: boolean;
}

export interface InterpreterFormData {
  id?: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  landline_phone: string;
  nationality: string;
  employment_status: "salaried" | "self_employed";
  languages: LanguagePair[];
  address: Address;
  birth_country: string;
  tarif_15min: number;
}

export const InterpreterProfileForm = ({
  isEditing,
  onSubmit,
  initialData = {},
  isSubmitting = false,
}: InterpreterProfileFormProps) => {
  const defaultAddress: Address = { street: "", postal_code: "", city: "" };
  const initialAddress = typeof initialData.address === 'string' 
    ? JSON.parse(initialData.address) as Address 
    : (initialData.address as Address) || defaultAddress;

  const [formData, setFormData] = useState<InterpreterFormData>({
    id: initialData.id,
    email: initialData.email || "",
    first_name: initialData.first_name || "",
    last_name: initialData.last_name || "",
    phone_number: initialData.phone_number || "",
    landline_phone: initialData.landline_phone || "",
    nationality: initialData.nationality || "",
    employment_status: initialData.employment_status || "salaried",
    languages: initialData.languages || [],
    address: initialAddress,
    birth_country: initialData.birth_country || "",
    tarif_15min: initialData.tarif_15min || 0,
  });

  useEffect(() => {
    if (initialData.id) {
      fetchInterpreterLanguages(initialData.id);
    }
  }, [initialData.id]);

  const fetchInterpreterLanguages = async (interpreterId: string) => {
    try {
      const { data: languages, error } = await supabase
        .from("interpreter_languages")
        .select("*")
        .eq("interpreter_id", interpreterId);

      if (error) throw error;

      const languagePairs: LanguagePair[] = languages.map((lang) => ({
        source: lang.source_language,
        target: lang.target_language,
      }));

      setFormData((prev) => ({ ...prev, languages: languagePairs }));
    } catch (error) {
      console.error("Error fetching interpreter languages:", error);
    }
  };

  const handleChange = (field: keyof InterpreterFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field: keyof Address, value: string) => {
    setFormData((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submissionData = {
      ...formData,
      address: JSON.stringify(formData.address),
    };
    onSubmit(submissionData as InterpreterFormData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            disabled={!isEditing}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="first_name">Prénom</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => handleChange("first_name", e.target.value)}
            disabled={!isEditing}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="last_name">Nom</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => handleChange("last_name", e.target.value)}
            disabled={!isEditing}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone_number">Téléphone mobile</Label>
          <Input
            id="phone_number"
            value={formData.phone_number}
            onChange={(e) => handleChange("phone_number", e.target.value)}
            disabled={!isEditing}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="landline_phone">Téléphone fixe</Label>
          <Input
            id="landline_phone"
            value={formData.landline_phone}
            onChange={(e) => handleChange("landline_phone", e.target.value)}
            disabled={!isEditing}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nationality">Nationalité</Label>
          <CountrySelect
            value={formData.nationality}
            onValueChange={(value) => handleChange("nationality", value)}
            disabled={!isEditing}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="birth_country">Pays de naissance</Label>
          <CountrySelect
            value={formData.birth_country}
            onValueChange={(value) => handleChange("birth_country", value)}
            disabled={!isEditing}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="employment_status">Statut professionnel</Label>
          <Select
            value={formData.employment_status}
            onValueChange={(value: "salaried" | "self_employed") =>
              handleChange("employment_status", value)
            }
            disabled={!isEditing}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="salaried">Salarié</SelectItem>
              <SelectItem value="self_employed">Auto-entrepreneur</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tarif_15min">Tarif (15 minutes)</Label>
          <Input
            id="tarif_15min"
            type="number"
            min="0"
            step="0.01"
            value={formData.tarif_15min}
            onChange={(e) => handleChange("tarif_15min", parseFloat(e.target.value))}
            disabled={!isEditing}
          />
        </div>
      </div>

      <div className="space-y-4">
        <Label>Adresse</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="street">Rue</Label>
            <Input
              id="street"
              value={formData.address.street}
              onChange={(e) => handleAddressChange("street", e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postal_code">Code postal</Label>
            <Input
              id="postal_code"
              value={formData.address.postal_code}
              onChange={(e) => handleAddressChange("postal_code", e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Ville</Label>
            <Input
              id="city"
              value={formData.address.city}
              onChange={(e) => handleAddressChange("city", e.target.value)}
              disabled={!isEditing}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Label>Combinaisons de langues</Label>
        <LanguageSelector
          languages={formData.languages}
          onChange={(languages) => handleChange("languages", languages)}
          isEditing={isEditing}
        />
      </div>

      <button
        type="submit"
        className="w-full px-4 py-2 text-white bg-primary rounded hover:bg-primary/90 disabled:opacity-50"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
};
