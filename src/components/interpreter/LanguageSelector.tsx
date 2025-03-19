
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LANGUAGES } from "@/lib/constants";
import { LanguagePair, isValidLanguagePair } from "@/types/languages";
import { LanguageSearchSelect } from "@/components/admin/LanguageSearchSelect";

interface LanguageSelectorProps {
  languages: LanguagePair[];
  onChange: (languages: LanguagePair[]) => void;
  isEditing: boolean;
}

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
      {languages.filter(isValidLanguagePair).map((lang, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2">
            <Badge variant="secondary">{lang.source}</Badge>
            <span>→</span>
            <Badge variant="secondary">{lang.target}</Badge>
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
          <div className="w-[200px]">
            <LanguageSearchSelect
              value={newSource}
              onValueChange={(value) => setNewSource(value === "all" ? "" : value)}
              placeholder="Langue source"
            />
          </div>

          <div className="w-[200px]">
            <LanguageSearchSelect
              value={newTarget}
              onValueChange={(value) => setNewTarget(value === "all" ? "" : value)}
              placeholder="Langue cible"
            />
          </div>

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
