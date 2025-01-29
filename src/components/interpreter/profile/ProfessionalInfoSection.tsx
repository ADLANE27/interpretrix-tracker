import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LanguageSelector, LanguagePair } from "../LanguageSelector";

type EmploymentStatus = "salaried" | "self_employed";

interface ProfessionalInfoProps {
  employmentStatus: EmploymentStatus;
  languages: LanguagePair[];
  isEditing: boolean;
  onEmploymentStatusChange: (status: EmploymentStatus) => void;
  onLanguagesChange: (languages: LanguagePair[]) => void;
}

export const ProfessionalInfoSection = ({
  employmentStatus,
  languages,
  isEditing,
  onEmploymentStatusChange,
  onLanguagesChange,
}: ProfessionalInfoProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Informations professionnelles</h3>
      
      <div className="space-y-2">
        <Label htmlFor="employment_status">Statut professionnel</Label>
        <Select
          value={employmentStatus}
          onValueChange={(value: EmploymentStatus) => onEmploymentStatusChange(value)}
          disabled={!isEditing}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionnez votre statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="salaried">Salarié / Interprète permanent</SelectItem>
            <SelectItem value="self_employed">Auto-entrepreneur</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Combinaisons de langues</Label>
        <LanguageSelector
          languages={languages}
          onChange={onLanguagesChange}
          isEditing={isEditing}
        />
      </div>
    </div>
  );
};