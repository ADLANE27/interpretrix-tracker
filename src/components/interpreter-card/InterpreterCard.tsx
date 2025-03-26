
import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Phone, Clock, User, PhoneCall, Home, Building, RotateCw } from 'lucide-react';
import { Profile } from '@/types/profile';
import { EmploymentStatus } from '@/utils/employmentStatus';
import { WorkLocation } from '@/utils/workLocationStatus';
import { CardFrontContent } from './CardFrontContent';
import { CardBackContent } from './CardBackContent';

interface InterpreterCardProps {
  interpreter: {
    id: string;
    name: string;
    status: Profile['status'];
    employment_status: EmploymentStatus;
    languages: string[];
    tarif_15min: number | null;
    tarif_5min: number | null;
    phone_number: string | null;
    next_mission_start: string | null;
    next_mission_duration: number | null;
    next_mission_source_language?: string | null;
    next_mission_target_language?: string | null;
    booth_number?: string | null;
    private_phone?: string | null;
    professional_phone?: string | null;
    landline_phone?: string | null;
    work_hours?: {
      start_morning?: string;
      end_morning?: string;
      start_afternoon?: string;
      end_afternoon?: string;
    } | null;
    work_location?: WorkLocation;
  };
  onStatusChange?: (interpreterId: string, newStatus: Profile['status']) => void;
}

const InterpreterCard: React.FC<InterpreterCardProps> = ({ interpreter, onStatusChange }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  
  const parsedLanguages = interpreter.languages
    .map(lang => {
      const [source, target] = lang.split('→').map(l => l.trim());
      return { source, target };
    })
    .filter(lang => lang.source && lang.target);

  const hasAnyPhoneNumber = 
    interpreter.phone_number || 
    interpreter.landline_phone || 
    interpreter.private_phone || 
    interpreter.professional_phone || 
    interpreter.booth_number;

  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="preserve-3d perspective-1000 w-full h-full relative">
      {/* Front Card */}
      <Card
        asMotion
        motionProps={{
          animate: { 
            rotateY: isFlipped ? 180 : 0 
          },
          transition: { 
            duration: 0.6, 
            type: "spring", 
            stiffness: 260, 
            damping: 20 
          }
        }}
        className={`hover-elevate gradient-border w-full h-full backface-hidden ${isFlipped ? 'invisible' : 'visible'}`}
      >
        <CardContent className="p-1.5 relative flex flex-col h-full">
          <CardFrontContent 
            interpreter={interpreter}
            parsedLanguages={parsedLanguages}
            hasAnyPhoneNumber={hasAnyPhoneNumber}
            onStatusChange={onStatusChange}
            onFlipCard={flipCard}
          />
        </CardContent>
      </Card>

      {/* Back Card */}
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
        className={`hover-elevate gradient-border w-full h-full backface-hidden absolute top-0 left-0 ${isFlipped ? 'visible' : 'invisible'}`}
      >
        <CardContent className="p-1.5 relative h-full flex flex-col">
          <CardBackContent 
            name={interpreter.name}
            parsedLanguages={parsedLanguages}
            onFlipCard={flipCard}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default InterpreterCard;
