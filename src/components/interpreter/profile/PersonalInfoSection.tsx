import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CountrySelect } from "@/components/CountrySelect";

interface PersonalInfoProps {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  birthCountry: string | null;
  nationality: string | null;
  isEditing: boolean;
  onChange: (field: string, value: string) => void;
}

export const PersonalInfoSection = ({
  firstName,
  lastName,
  email,
  phoneNumber,
  birthCountry,
  nationality,
  isEditing,
  onChange,
}: PersonalInfoProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Informations personnelles</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">Prénom</Label>
          <Input
            id="first_name"
            value={firstName}
            onChange={(e) => onChange("firstName", e.target.value)}
            disabled={!isEditing}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="last_name">Nom</Label>
          <Input
            id="last_name"
            value={lastName}
            onChange={(e) => onChange("lastName", e.target.value)}
            disabled={!isEditing}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => onChange("email", e.target.value)}
            disabled={!isEditing}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone_number">Numéro de téléphone</Label>
          <Input
            id="phone_number"
            value={phoneNumber || ""}
            onChange={(e) => onChange("phoneNumber", e.target.value)}
            disabled={!isEditing}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="birth_country">Pays de naissance</Label>
          <CountrySelect
            value={birthCountry || ""}
            onValueChange={(value) => onChange("birthCountry", value)}
            label="Pays de naissance"
            placeholder="Sélectionner votre pays de naissance"
            disabled={!isEditing}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nationality">Nationalité</Label>
          <Input
            id="nationality"
            value={nationality || ""}
            onChange={(e) => onChange("nationality", e.target.value)}
            disabled={!isEditing}
          />
        </div>
      </div>
    </div>
  );
};