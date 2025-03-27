
import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { RotateCw } from 'lucide-react';

interface CardBackProps {
  interpreter: {
    name: string;
  };
  isFlipped: boolean;
  parsedLanguages: Array<{
    source: string;
    target: string;
  }>;
  flipCard: () => void;
}

export const CardBack: React.FC<CardBackProps> = ({
  interpreter,
  isFlipped,
  parsedLanguages,
  flipCard
}) => {
  const nameParts = interpreter.name.split(' ');
  const lastName = nameParts.shift() || '';
  const firstName = nameParts.join(' ');

  return (
    <Card
      asMotion
      motionProps={{
        animate: { 
          rotateY: isFlipped ? 0 : -180 
        },
        transition: { 
          duration: 0.6, 
          type: "spring", 
          stiffness: 260, 
          damping: 20 
        }
      }}
      className={`hover-elevate gradient-border w-full h-full backface-hidden absolute top-0 left-0 border-2 border-palette-soft-purple/50 shadow-md ${isFlipped ? 'visible' : 'invisible'}`}
    >
      <CardContent className="p-2 relative flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-medium text-gradient-primary leading-tight">{lastName}</h3>
            {firstName && <span className="text-xs text-muted-foreground block">{firstName}</span>}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0 rounded-full" 
            onClick={flipCard}
          >
            <RotateCw className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>
        
        <div className="mb-1 text-xs font-medium text-muted-foreground">Combinaisons de langues:</div>
        <div className="flex flex-wrap gap-1 max-h-[calc(100%-60px)] overflow-y-auto pr-1 hide-scrollbar">
          {parsedLanguages.map((lang, index) => (
            <div
              key={index}
              className="px-1.5 py-0.5 bg-gradient-to-r from-palette-soft-blue to-palette-soft-purple text-slate-700 rounded text-[11px] flex items-center gap-0.5"
            >
              <span>{lang.source}</span>
              <span className="text-palette-vivid-purple">→</span>
              <span>{lang.target}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
