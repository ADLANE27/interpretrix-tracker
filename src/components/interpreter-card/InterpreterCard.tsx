
import React from 'react';
import { Profile } from '@/types/profile';
import { EmploymentStatus } from '@/utils/employmentStatus';
import { WorkLocation } from '@/utils/workLocationStatus';
import { CardFront } from './CardFront';
import { CardBack } from './CardBack';
import { useInterpreterCard } from './useInterpreterCard';

export interface InterpreterCardProps {
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
  const { 
    status, 
    isFlipped, 
    flipCard, 
    handleStatusChange, 
    parsedLanguages, 
    hasAnyPhoneNumber,
    workLocation,
    locationConfig,
    showTarif5min,
    showTarif15min,
    hasFutureMission
  } = useInterpreterCard(interpreter, onStatusChange);

  return (
    <div className="preserve-3d perspective-1000 w-full h-full relative">
      <CardFront
        interpreter={interpreter}
        status={status}
        isFlipped={isFlipped}
        handleStatusChange={handleStatusChange}
        hasAnyPhoneNumber={hasAnyPhoneNumber}
        workLocation={workLocation}
        locationConfig={locationConfig}
        showTarif5min={showTarif5min}
        showTarif15min={showTarif15min}
        hasFutureMission={hasFutureMission}
        flipCard={flipCard}
      />

      <CardBack
        interpreter={interpreter}
        isFlipped={isFlipped}
        parsedLanguages={parsedLanguages}
        flipCard={flipCard}
      />
    </div>
  );
};

export default InterpreterCard;
