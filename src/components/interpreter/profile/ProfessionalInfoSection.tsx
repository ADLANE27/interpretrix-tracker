
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LanguageSelector } from "@/components/interpreter/LanguageSelector";
import { LanguagePair } from "@/types/languages";
import { EmploymentStatus, employmentStatusLabels } from "@/types/employment";

export interface ProfessionalInfoSectionProps {
  employmentStatus: EmploymentStatus;
  onEmploymentStatusChange: (status: EmploymentStatus) => void;
  languages: LanguagePair[];
  onLanguagesChange: (languages: LanguagePair[]) => void;
  tarif5min: number;
  onTarif5minChange: (value: number) => void;
  tarif15min: number;
  onTarif15minChange: (value: number) => void;
  phoneInterpretationRate: number;
  onPhoneInterpretationRateChange: (value: number) => void;
  siretNumber: string;
  onSiretNumberChange: (value: string) => void;
  vatNumber: string;
  onVatNumberChange: (value: string) => void;
  isEditing: boolean;
}

export const ProfessionalInfoSection = ({ 
  employmentStatus,
  onEmploymentStatusChange,
  languages,
  onLanguagesChange,
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
  isEditing 
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
              {Object.entries(employmentStatusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
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
