
import React from 'react';
import { Button } from '../ui/button';
import { LanguageBadge } from './LanguageBadge';
import { RotateCw } from 'lucide-react';

interface CardBackContentProps {
  name: string;
  parsedLanguages: { source: string; target: string }[];
  onFlipCard: () => void;
}

export const CardBackContent: React.FC<CardBackContentProps> = ({ 
  name, 
  parsedLanguages, 
  onFlipCard 
}) => {
  return (
    <>
      {/* Back card header */}
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-sm font-medium text-gradient-primary truncate">{name}</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0 rounded-full" 
          onClick={onFlipCard}
        >
          <RotateCw className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>
      
      {/* Languages section */}
      <div className="mb-1 text-xs font-medium text-muted-foreground">Combinaisons de langues:</div>
      <div className="flex flex-wrap gap-1 overflow-y-auto pr-1 hide-scrollbar grow">
        {parsedLanguages.map((lang, index) => (
          <LanguageBadge key={index} source={lang.source} target={lang.target} />
        ))}
      </div>
    </>
  );
};
