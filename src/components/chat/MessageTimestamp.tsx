
import React from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MessageTimestampProps {
  date: Date;
  className?: string;
}

export const MessageTimestamp: React.FC<MessageTimestampProps> = ({ date, className }) => {
  const formatMessageDate = () => {
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: fr });
    } else if (isYesterday(date)) {
      return `Hier ${format(date, 'HH:mm', { locale: fr })}`;
    }
    return format(date, "d MMM' à 'HH:mm", { locale: fr });
  };

  return (
    <span className={`text-xs text-gray-500 ${className || ''}`}>
      {formatMessageDate()}
    </span>
  );
};

