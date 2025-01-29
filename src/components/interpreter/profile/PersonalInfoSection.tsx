import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CountrySelect } from "@/components/CountrySelect";

interface PersonalInfoProps {
  firstName: string;
  lastName: string;
  email: string;
  mobilePhone: string | null;
  landlinePhone: string | null;
  nationality: string | null;
  isEditing: boolean;
  onChange: (field: string, value: string | null) => void;
}

export const PersonalInfoSection = ({
  firstName,
  lastName,
  email,
  mobilePhone,
  landlinePhone,
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
          <Label htmlFor="mobile_phone">Téléphone mobile</Label>
          <Input
            id="mobile_phone"
            value={mobilePhone || ""}
            onChange={(e) => onChange("mobilePhone", e.target.value)}
            disabled={!isEditing}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="landline_phone">Téléphone fixe</Label>
          <Input
            id="landline_phone"
            value={landlinePhone || ""}
            onChange={(e) => onChange("landlinePhone", e.target.value)}
            disabled={!isEditing}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nationality">Nationalité</Label>
          <CountrySelect
            value={nationality || ""}
            onValueChange={(value) => onChange("nationality", value)}
            disabled={!isEditing}
          />
        </div>
      </div>
    </div>
  );
};