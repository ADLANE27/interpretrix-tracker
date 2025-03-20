
import React from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DateSeparatorProps {
  date: Date;
}

export const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  const formatMessageDate = (date: Date) => {
    if (isToday(date)) {
      return "Aujourd'hui";
    } else if (isYesterday(date)) {
      return "Hier";
    }
    return format(date, 'EEEE d MMMM yyyy', { locale: fr });
  };

  return (
    <div className="flex justify-center my-5">
      <div className="bg-[#E2E2E2] text-[#8A898C] px-4 py-1.5 rounded-full text-sm font-medium shadow-sm">
        {formatMessageDate(date)}
      </div>
    </div>
  );
};
