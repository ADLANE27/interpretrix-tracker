import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LanguageSelector, LanguagePair } from "../LanguageSelector";

type EmploymentStatus = "salaried" | "self_employed";

interface ProfessionalInfoProps {
  employmentStatus: EmploymentStatus;
  languages: LanguagePair[];
  phoneInterpretationRate: number | null;
  siretNumber: string | null;
  vatNumber: string | null;
  isEditing: boolean;
  onEmploymentStatusChange: (status: EmploymentStatus) => void;
  onLanguagesChange: (languages: LanguagePair[]) => void;
  onRateChange: (rate: number | null) => void;
  onSiretChange: (siret: string) => void;
  onVatChange: (vat: string) => void;
}

export const ProfessionalInfoSection = ({
  employmentStatus,
  languages,
  phoneInterpretationRate,
  siretNumber,
  vatNumber,
  isEditing,
  onEmploymentStatusChange,
  onLanguagesChange,
  onRateChange,
  onSiretChange,
  onVatChange,
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
            <SelectItem value="salaried">Salarié</SelectItem>
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

      {employmentStatus === "self_employed" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="phone_interpretation_rate">
              Tarif interprétariat téléphonique (€/min)
            </Label>
            <Input
              id="phone_interpretation_rate"
              type="number"
              step="0.01"
              value={phoneInterpretationRate || ""}
              onChange={(e) => onRateChange(parseFloat(e.target.value) || null)}
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="siret_number">Numéro SIRET</Label>
            <Input
              id="siret_number"
              value={siretNumber || ""}
              onChange={(e) => onSiretChange(e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vat_number">Numéro de TVA</Label>
            <Input
              id="vat_number"
              value={vatNumber || ""}
              onChange={(e) => onVatChange(e.target.value)}
              disabled={!isEditing}
            />
          </div>
        </>
      )}
    </div>
  );
};