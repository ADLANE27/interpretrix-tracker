
import React from 'react';
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";

interface MessageDateDividerProps {
  date: Date;
}

export const MessageDateDivider: React.FC<MessageDateDividerProps> = ({ date }) => {
  const formatMessageDate = (date: Date) => {
    if (isToday(date)) {
      return "Aujourd'hui";
    } else if (isYesterday(date)) {
      return "Hier";
    }
    return format(date, 'EEEE d MMMM yyyy', { locale: fr });
  };

  return (
    <div className="flex justify-center my-4">
      <div className="bg-[#E2E2E2] text-[#8A898C] px-4 py-1.5 rounded-full text-[13px] font-medium shadow-sm">
        {formatMessageDate(date)}
      </div>
    </div>
  );
};
