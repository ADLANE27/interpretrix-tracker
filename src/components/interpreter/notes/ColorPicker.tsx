
import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";
import { useState } from "react";

export interface ColorOption {
  name: string;
  color: string;
  textColor: string;
  borderColor?: string;
}

export const colorOptions: ColorOption[] = [
  { name: "Default", color: "transparent", textColor: "inherit", borderColor: "#e2e8f0" },
  { name: "Blue", color: "#dbeafe", textColor: "#1e40af", borderColor: "#bfdbfe" },
  { name: "Green", color: "#dcfce7", textColor: "#166534", borderColor: "#bbf7d0" },
  { name: "Purple", color: "#f3e8ff", textColor: "#7e22ce", borderColor: "#e9d5ff" },
  { name: "Yellow", color: "#fef9c3", textColor: "#854d0e", borderColor: "#fef08a" },
  { name: "Orange", color: "#ffedd5", textColor: "#9a3412", borderColor: "#fed7aa" },
  { name: "Red", color: "#fee2e2", textColor: "#b91c1c", borderColor: "#fecaca" },
  { name: "Pink", color: "#fce7f3", textColor: "#be185d", borderColor: "#fbcfe8" },
  { name: "Gray", color: "#f3f4f6", textColor: "#374151", borderColor: "#e5e7eb" },
];

interface ColorPickerProps {
  selectedColor: string;
  onChange: (color: string) => void;
}

export const ColorPicker = ({ selectedColor, onChange }: ColorPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (color: string) => {
    onChange(color);
    setIsOpen(false);
  };

  const selected = colorOptions.find(option => option.color === selectedColor) || colorOptions[0];

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div 
          className="w-4 h-4 rounded-full border" 
          style={{ 
            backgroundColor: selected.color,
            borderColor: selected.borderColor || selected.color
          }}
        />
        <Palette className="w-4 h-4" />
      </Button>

      {isOpen && (
        <div className="absolute z-10 top-full left-0 mt-1 p-2 bg-popover border rounded-lg shadow-lg flex flex-wrap gap-2 w-[180px]">
          {colorOptions.map((option) => (
            <button
              key={option.name}
              type="button"
              className="w-8 h-8 rounded-full border flex items-center justify-center"
              style={{ 
                backgroundColor: option.color,
                borderColor: option.borderColor || option.color
              }}
              title={option.name}
              onClick={() => handleSelect(option.color)}
            >
              {option.color === selectedColor && (
                <span className="text-xs" style={{ color: option.textColor }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
