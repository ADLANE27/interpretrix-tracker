import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMention?: (mentionData: { type: "user" | "language", value: string }) => void;
  placeholder?: string;
  className?: string;
}

export const MentionInput = ({ value, onChange, onMention, placeholder, className }: MentionInputProps) => {
  const [mentionSearch, setMentionSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: interpreters } = useQuery({
    queryKey: ["interpreters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interpreter_profiles")
        .select("id, first_name, last_name, languages");
      
      if (error) throw error;
      return data || [];
    },
  });

  const languages = Array.from(
    new Set(
      interpreters?.flatMap(interpreter => 
        (interpreter.languages as string[]).map(lang => 
          lang.split("→")[1].trim()
        )
      ) || []
    )
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const position = e.target.selectionStart;
    
    onChange(newValue);
    setCursorPosition(position);

    // Check for @ symbol
    const lastAtSymbol = newValue.lastIndexOf("@", position);
    if (lastAtSymbol !== -1 && lastAtSymbol < position) {
      const searchText = newValue.slice(lastAtSymbol + 1, position).toLowerCase();
      setMentionSearch(searchText);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string, isLanguage: boolean = false) => {
    if (!textareaRef.current) return;

    const lastAtSymbol = value.lastIndexOf("@", cursorPosition);
    if (lastAtSymbol === -1) return;

    const before = value.slice(0, lastAtSymbol);
    const after = value.slice(cursorPosition);
    const newValue = `${before}@${suggestion}${after}`;
    
    onChange(newValue);
    setShowSuggestions(false);

    if (onMention) {
      onMention({
        type: isLanguage ? "language" : "user",
        value: suggestion
      });
    }
  };

  const filteredSuggestions = showSuggestions
    ? [
        ...languages
          .filter(lang => 
            lang.toLowerCase().includes(mentionSearch.toLowerCase())
          )
          .map(lang => ({ value: lang, isLanguage: true })),
        ...(interpreters || [])
          .filter(user =>
            `${user.first_name} ${user.last_name}`
              .toLowerCase()
              .includes(mentionSearch.toLowerCase())
          )
          .map(user => ({
            value: `${user.first_name} ${user.last_name}`,
            isLanguage: false
          }))
      ]
    : [];

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={className}
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={index}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
              onClick={() => handleSuggestionClick(suggestion.value, suggestion.isLanguage)}
            >
              <span className="mr-2">
                {suggestion.isLanguage ? "🌐" : "👤"}
              </span>
              {suggestion.value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};