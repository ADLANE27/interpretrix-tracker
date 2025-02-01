import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    <div className="flex gap-2 flex-wrap">
      {interpreters.map((interpreter) => (
        <Button
          key={interpreter.id}
          variant={selectedInterpreter === interpreter.id ? "default" : "outline"}
          onClick={() => onSelectInterpreter(interpreter.id)}
          className="relative"
        >
          {interpreter.first_name} {interpreter.last_name}
          {unreadCounts[interpreter.id] > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 rounded-full"
            >
              {unreadCounts[interpreter.id]}
            </Badge>
          )}
        </Button>
      ))}
    </div>
  );
};