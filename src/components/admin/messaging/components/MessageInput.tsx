import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
}

export const MessageInput = ({ value, onChange, onSend }: MessageInputProps) => {
  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tapez votre message..."
        onKeyPress={(e) => {
          if (e.key === "Enter") {
            onSend();
          }
        }}
      />
      <Button onClick={onSend}>
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
};