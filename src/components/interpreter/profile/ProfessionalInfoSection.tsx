import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type LanguagePair } from "@/types/languages";
import { LanguageSelector } from "../LanguageSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProfessionalInfoSectionProps {
  languages: LanguagePair[];
  onLanguagesChange: (languages: LanguagePair[]) => void;
  isEditing: boolean;
  employmentStatus: string;
  onEmploymentStatusChange: (status: string) => void;
  tarif5min: number;
  onTarif5minChange: (tarif: number) => void;
  tarif15min: number;
  onTarif15minChange: (tarif: number) => void;
  phoneInterpretationRate: number;
  onPhoneInterpretationRateChange: (rate: number) => void;
  siretNumber: string;
  onSiretNumberChange: (siret: string) => void;
  vatNumber: string;
  onVatNumberChange: (vat: string) => void;
}

export const ProfessionalInfoSection = ({
  languages,
  onLanguagesChange,
  isEditing,
  employmentStatus,
  onEmploymentStatusChange,
  tarif5min,
  onTarif5minChange,
  tarif15min,
  onTarif15minChange,
  phoneInterpretationRate,
  onPhoneInterpretationRateChange,
  siretNumber,
  onSiretNumberChange,
  vatNumber,
  onVatNumberChange,
}: ProfessionalInfoSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations professionnelles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Langues de travail</Label>
          <LanguageSelector
            languages={languages}
            onChange={onLanguagesChange}
            isEditing={isEditing}
          />
        </div>

        <div className="space-y-2">
          <Label>Statut professionnel</Label>
          <Select
            value={employmentStatus}
            onValueChange={onEmploymentStatusChange}
            disabled={!isEditing}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez un statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="salaried_aft">Salarié AFTrad</SelectItem>
              <SelectItem value="salaried_aftcom">Salarié AFTCOM</SelectItem>
              <SelectItem value="salaried_planet">Salarié PLANET</SelectItem>
              <SelectItem value="permanent_interpreter">Interprète permanent</SelectItem>
              <SelectItem value="self_employed">Auto-entrepreneur</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tarif (5 minutes)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={tarif5min}
              onChange={(e) => onTarif5minChange(parseFloat(e.target.value))}
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label>Tarif (15 minutes)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={tarif15min}
              onChange={(e) => onTarif15minChange(parseFloat(e.target.value))}
              disabled={!isEditing}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Tarif d'interprétation téléphonique (€/min)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={phoneInterpretationRate}
            onChange={(e) => onPhoneInterpretationRateChange(parseFloat(e.target.value))}
            disabled={!isEditing}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Numéro SIRET</Label>
            <Input
              value={siretNumber}
              onChange={(e) => onSiretNumberChange(e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label>Numéro de TVA</Label>
            <Input
              value={vatNumber}
              onChange={(e) => onVatNumberChange(e.target.value)}
              disabled={!isEditing}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
