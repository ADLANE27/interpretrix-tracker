
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LANGUAGES } from "@/lib/constants";
import { LanguagePair, isValidLanguagePair } from "@/types/languages";
import { LanguageCombobox } from "./LanguageCombobox";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface LanguageSelectorProps {
  languages: LanguagePair[];
  onChange: (languages: LanguagePair[]) => void;
  isEditing: boolean;
}

export const LanguageSelector = ({ languages, onChange, isEditing }: LanguageSelectorProps) => {
  const [newSource, setNewSource] = useState<string>("");
  const [newTarget, setNewTarget] = useState<string>("");
  const [activeField, setActiveField] = useState<"source" | "target" | null>(null);

  // Focus on the target field when source is selected
  useEffect(() => {
    if (newSource && !newTarget) {
      setActiveField("target");
    }
  }, [newSource]);

  const handleAddLanguage = () => {
    if (newSource && newTarget) {
      // Check if this exact pair already exists
      const pairExists = languages.some(
        lang => lang.source === newSource && lang.target === newTarget
      );
      
      if (!pairExists) {
        onChange([...languages, { source: newSource, target: newTarget }]);
      }
      
      setNewSource("");
      setNewTarget("");
      setActiveField("source"); // Reset focus to source for next entry
    }
  };

  const handleRemoveLanguage = (index: number) => {
    const updatedLanguages = languages.filter((_, i) => i !== index);
    onChange(updatedLanguages);
  };

  return (
    <div className="space-y-4">
      {/* Selected language pairs */}
      {languages.filter(isValidLanguagePair).length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {languages.filter(isValidLanguagePair).map((lang, index) => (
            <Card key={index} className="bg-gray-50 dark:bg-gray-800 border shadow-sm">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="bg-white dark:bg-gray-700 truncate max-w-[5rem] sm:max-w-none">
                    {lang.source}
                  </Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <Badge variant="outline" className="bg-white dark:bg-gray-700 truncate max-w-[5rem] sm:max-w-none">
                    {lang.target}
                  </Badge>
                </div>
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveLanguage(index)}
                    className="h-6 w-6 ml-1 flex-shrink-0"
                    aria-label="Supprimer cette paire de langues"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        isEditing ? (
          <div className="text-sm text-muted-foreground">
            Aucune paire de langues sélectionnée. Ajoutez au moins une paire.
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Aucune paire de langues disponible.
          </div>
        )
      )}

      {/* Add new language pair controls */}
      {isEditing && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <Label className="block mb-3 text-sm font-medium">
              Ajouter une nouvelle paire de langues
            </Label>
            
            <div className="grid gap-3 sm:grid-cols-[1fr,auto,1fr,auto]">
              {/* Source language */}
              <div className={activeField === "source" ? "ring-1 ring-purple-500 rounded-md" : ""}>
                <LanguageCombobox
                  languages={LANGUAGES}
                  value={newSource}
                  onChange={setNewSource}
                  placeholder="Langue source"
                  emptyMessage="Aucune langue trouvée"
                  allLanguagesOption={false}
                  className={activeField === "source" ? "border-purple-500" : ""}
                />
              </div>
              
              {/* Arrow icon */}
              <div className="hidden sm:flex items-center justify-center">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              
              {/* Target language */}
              <div className={activeField === "target" ? "ring-1 ring-purple-500 rounded-md" : ""}>
                <LanguageCombobox
                  languages={LANGUAGES}
                  value={newTarget}
                  onChange={setNewTarget}
                  placeholder="Langue cible"
                  emptyMessage="Aucune langue trouvée"
                  allLanguagesOption={false}
                  className={activeField === "target" ? "border-purple-500" : ""}
                />
              </div>
              
              {/* Add button */}
              <Button
                type="button"
                onClick={handleAddLanguage}
                disabled={!newSource || !newTarget}
                className="h-10 mt-0 sm:mt-0"
                size="icon"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
