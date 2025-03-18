
import React from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface MessageDateDividerProps {
  date: Date;
  className?: string;
}

export const MessageDateDivider: React.FC<MessageDateDividerProps> = ({
  date,
  className
}) => {
  const formatMessageDate = (date: Date) => {
    if (isToday(date)) {
      return "Aujourd'hui";
    } else if (isYesterday(date)) {
      return "Hier";
    }
    return format(date, 'EEEE d MMMM yyyy', { locale: fr });
  };

  return (
    <div className={cn("flex justify-center my-4", className)}>
      <div className="bg-[#E2E2E2] text-[#8A898C] px-4 py-1.5 rounded-full text-[13px] font-medium shadow-sm">
        {formatMessageDate(date)}
      </div>
    </div>
  );
};
