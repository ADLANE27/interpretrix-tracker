import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { Interpreter } from "./types";

interface SearchSectionProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  interpreters: Interpreter[];
  onSelectInterpreter: (interpreter: Interpreter) => void;
}

export const SearchSection = ({
  searchTerm,
  onSearchChange,
  interpreters,
  onSelectInterpreter,
}: SearchSectionProps) => {
  return (
    <div className="mb-4">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
        />
      </div>

      {searchTerm && interpreters.length > 0 && (
        <div className="space-y-2 mb-4">
          <h3 className="text-sm font-medium text-gray-400 px-2">Résultats</h3>
          {interpreters.map((user) => (
            <Button
              key={user.id}
              variant="ghost"
              className="w-full justify-start text-left"
              onClick={() => onSelectInterpreter(user)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              <div className="flex flex-col items-start">
                <span>
                  {user.first_name} {user.last_name}
                  {user.isAdmin ? ' (Admin)' : ''}
                </span>
                <span className="text-xs text-gray-500">{user.email}</span>
              </div>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};