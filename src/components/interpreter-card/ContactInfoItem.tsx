
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ContactInfoItemProps {
  icon: LucideIcon;
  text: string;
  className?: string;
}

export const ContactInfoItem: React.FC<ContactInfoItemProps> = ({ 
  icon: Icon, 
  text, 
  className = ""
}) => {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Icon className="h-3.5 w-3.5 text-palette-ocean-blue" />
      <span>{text}</span>
    </div>
  );
};
