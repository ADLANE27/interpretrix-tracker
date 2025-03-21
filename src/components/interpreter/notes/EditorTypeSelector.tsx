
import { Type, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditorTypeSelectorProps {
  editorType: 'text' | 'drawing';
  onChange: (type: 'text' | 'drawing') => void;
}

export const EditorTypeSelector = ({ editorType, onChange }: EditorTypeSelectorProps) => {
  return (
    <div className="flex items-center space-x-2 mb-2">
      <Button
        type="button"
        variant={editorType === 'text' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onChange('text')}
        className="gap-2"
      >
        <Type className="h-4 w-4" />
        Texte
      </Button>
      <Button
        type="button"
        variant={editorType === 'drawing' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onChange('drawing')}
        className="gap-2"
      >
        <PencilLine className="h-4 w-4" />
        Dessin
      </Button>
    </div>
  );
};
