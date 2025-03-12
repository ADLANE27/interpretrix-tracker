
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageSelector } from "@/components/interpreter/LanguageSelector";
import { LanguagePair } from "@/types/languages";

interface LanguagesSectionProps {
  languages: LanguagePair[];
  onChange: (languages: LanguagePair[]) => void;
}

export const LanguagesSection = ({ languages, onChange }: LanguagesSectionProps) => {
  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-2xl">Langues</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <LanguageSelector
            languages={languages}
            onChange={onChange}
            isEditing={true}
          />
        </div>
      </CardContent>
    </Card>
  );
};
