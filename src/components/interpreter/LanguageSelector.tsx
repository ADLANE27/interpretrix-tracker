import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";

export interface LanguagePair {
  source: string;
  target: string;
}

interface LanguageSelectorProps {
  languages: LanguagePair[];
  onChange: (languages: LanguagePair[]) => void;
  isEditing: boolean;
}

const LANGUAGES = [
  "Français", "Anglais", "Espagnol", "Allemand", "Italien", "Portugais",
  "Arabe (Standard)", "Arabe (Maghrébin)", "Arabe (Levant)", "Arabe (Égyptien)",
  "Mandarin", "Cantonais", "Japonais", "Coréen",
  "Russe", "Ukrainien", "Polonais", "Tchèque",
  "Hindi", "Bengali", "Urdu", "Punjabi",
  "Turc", "Persan", "Kurde", "Arménien",
  "Vietnamien", "Thaï", "Indonésien", "Malais",
  "Swahili", "Amharique", "Somali", "Yoruba",
  "Langue des signes française (LSF)", "American Sign Language (ASL)",
  "Roumain", "Bulgare", "Grec", "Albanais",
  "Néerlandais", "Suédois", "Norvégien", "Danois",
  "Finnois", "Hongrois", "Slovaque", "Slovène",
  "Créole haïtien", "Créole réunionnais", "Créole mauricien",
  "Wolof", "Bambara", "Lingala", "Peul"
];

export const LanguageSelector = ({ languages, onChange, isEditing }: LanguageSelectorProps) => {
  const [newSource, setNewSource] = useState<string>("");
  const [newTarget, setNewTarget] = useState<string>("");

  const handleAddLanguage = () => {
    if (newSource && newTarget) {
      onChange([...languages, { source: newSource, target: newTarget }]);
      setNewSource("");
      setNewTarget("");
    }
  };

  const handleRemoveLanguage = (index: number) => {
    const updatedLanguages = languages.filter((_, i) => i !== index);
    onChange(updatedLanguages);
  };

  return (
    <div className="space-y-4">
      {languages.map((lang, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2">
            <span>{lang.source}</span>
            <span>→</span>
            <span>{lang.target}</span>
          </div>
          {isEditing && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveLanguage(index)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}

      {isEditing && (
        <div className="flex items-center gap-2">
          <Select value={newSource} onValueChange={setNewSource}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Langue source" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={newTarget} onValueChange={setNewTarget}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Langue cible" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleAddLanguage}
            disabled={!newSource || !newTarget}
            className="h-8 w-8"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};