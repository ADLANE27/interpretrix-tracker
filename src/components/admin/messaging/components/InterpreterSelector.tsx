import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Interpreter {
  id: string;
  first_name: string;
  last_name: string;
}

interface InterpreterSelectorProps {
  interpreters: Interpreter[];
  selectedInterpreter: string | null;
  unreadCounts: { [key: string]: number };
  onSelectInterpreter: (id: string) => void;
}

export const InterpreterSelector = ({
  interpreters,
  selectedInterpreter,
  unreadCounts,
  onSelectInterpreter,
}: InterpreterSelectorProps) => {
  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-1 p-2">
        {interpreters.map((interpreter) => (
          <Button
            key={interpreter.id}
            variant="ghost"
            onClick={() => onSelectInterpreter(interpreter.id)}
            className={`w-full justify-start relative px-3 py-2 text-sm ${
              selectedInterpreter === interpreter.id
                ? "bg-chat-selected text-white hover:bg-chat-selected"
                : "hover:bg-chat-hover"
            }`}
          >
            <span className="truncate">
              {interpreter.first_name} {interpreter.last_name}
            </span>
            {unreadCounts[interpreter.id] > 0 && (
              <Badge
                variant="destructive"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-5 min-w-[20px] flex items-center justify-center p-0 rounded-full"
              >
                {unreadCounts[interpreter.id]}
              </Badge>
            )}
          </Button>
        ))}
      </div>
    </ScrollArea>
  );
};