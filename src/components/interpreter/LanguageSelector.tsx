import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Comprehensive list of languages and dialects
const LANGUAGES = [
  "Français",
  "English (UK)",
  "English (US)",
  "العربية (Standard)",
  "العربية (Maghrebi)",
  "العربية (Egyptian)",
  "中文 (Mandarin)",
  "中文 (Cantonese)",
  "Español (Spain)",
  "Español (Latin America)",
  "Deutsch",
  "Italiano",
  "Português (Brazil)",
  "Português (Portugal)",
  "Русский",
  "日本語",
  "한국어",
  "हिन्दी",
  "বাংলা",
  "Türkçe",
  "Tiếng Việt",
  "ไทย",
  "Bahasa Indonesia",
  "Nederlands",
  "Polski",
  "Svenska",
  "Dansk",
  "Suomi",
  "Ελληνικά",
  "Magyar",
  "Čeština",
  "Română",
  "Български",
  "Hrvatski",
  "Српски",
  "Українська",
  "עברית",
  "فارسی",
  "اردو",
  "ਪੰਜਾਬੀ",
  "தமிழ்",
  "తెలుగు",
  "ಕನ್ನಡ",
  "മലയാളം",
  "Монгол",
  "ខ្មែរ",
  "ລາວ",
  "မြန်မာ",
  "Tagalog",
  "Cebuano",
  "Wolof",
  "Yorùbá",
  "Kiswahili",
  "አማርኛ",
  "Soomaali",
];

interface LanguagePair {
  source: string;
  target: string;
}

interface LanguageSelectorProps {
  languages: LanguagePair[];
  onChange: (languages: LanguagePair[]) => void;
  isEditing: boolean;
}

export const LanguageSelector = ({ languages, onChange, isEditing }: LanguageSelectorProps) => {
  const [sourceLanguage, setSourceLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");

  const handleAddLanguagePair = () => {
    if (sourceLanguage && targetLanguage) {
      const newPair = { source: sourceLanguage, target: targetLanguage };
      onChange([...languages, newPair]);
      setSourceLanguage("");
      setTargetLanguage("");
    }
  };

  const handleRemoveLanguagePair = (index: number) => {
    const newLanguages = languages.filter((_, i) => i !== index);
    onChange(newLanguages);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {languages.map((pair, index) => (
          <Badge
            key={index}
            variant="secondary"
            className={`cursor-pointer ${isEditing ? 'hover:bg-red-100' : ''}`}
            onClick={() => isEditing && handleRemoveLanguagePair(index)}
          >
            {pair.source} → {pair.target} {isEditing && '×'}
          </Badge>
        ))}
      </div>
      
      {isEditing && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
            <SelectTrigger className="w-full sm:w-[200px]">
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

          <Select value={targetLanguage} onValueChange={setTargetLanguage}>
            <SelectTrigger className="w-full sm:w-[200px]">
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
            type="button" 
            onClick={handleAddLanguagePair}
            disabled={!sourceLanguage || !targetLanguage}
          >
            Ajouter
          </Button>
        </div>
      )}
    </div>
  );
};