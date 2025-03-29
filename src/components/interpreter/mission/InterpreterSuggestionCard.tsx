
import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { employmentStatusLabels } from "@/utils/employmentStatus";

interface InterpreterSuggestionCardProps {
  interpreter: {
    id: string;
    first_name: string;
    last_name: string;
    status: string;
    profile_picture_url: string | null;
    employment_status: string;
    languages: string[];
    tarif_5min: number | null;
    tarif_15min: number | null;
  };
  isSelected: boolean;
  onClick: () => void;
}

export const InterpreterSuggestionCard: React.FC<InterpreterSuggestionCardProps> = ({
  interpreter,
  isSelected,
  onClick,
}) => {
  return (
    <Card
      className={`p-4 flex items-center space-x-3 hover:bg-gray-50 cursor-pointer transition-colors ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      onClick={onClick}
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={interpreter.profile_picture_url || undefined} />
        <AvatarFallback>
          {interpreter.first_name[0]}{interpreter.last_name[0]}
        </AvatarFallback>
      </Avatar>

      <div className="flex-grow">
        <p className="font-medium">
          {interpreter.first_name} {interpreter.last_name}
        </p>
        
        <div className="flex flex-wrap gap-1 mt-1">
          <Badge 
            variant="secondary" 
            className={
              interpreter.status === 'available'
                ? 'bg-green-100 text-green-800'
                : interpreter.status === 'busy'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }
          >
            {interpreter.status === 'available' 
              ? 'Disponible' 
              : interpreter.status === 'busy'
              ? 'En appel'
              : 'Indisponible'
            }
          </Badge>
          
          {/* Employment status badge */}
          {interpreter.employment_status && (
            <Badge variant="outline" className="text-xs bg-gray-50">
              {employmentStatusLabels[interpreter.employment_status as keyof typeof employmentStatusLabels] || interpreter.employment_status}
            </Badge>
          )}
        </div>
        
        {/* Rate badges */}
        <div className="flex flex-wrap gap-1 mt-1">
          {interpreter.tarif_5min !== null && interpreter.tarif_5min > 0 && (
            <Badge variant="outline" className="text-xs bg-gray-50">
              5min: {interpreter.tarif_5min}€
            </Badge>
          )}
          
          {interpreter.tarif_15min !== null && interpreter.tarif_15min > 0 && (
            <Badge variant="outline" className="text-xs bg-gray-50">
              15min: {interpreter.tarif_15min}€
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
};
