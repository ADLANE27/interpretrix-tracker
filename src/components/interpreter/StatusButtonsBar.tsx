
import React from 'react';
import { Profile } from '@/types/profile';
import { useIsMobile } from '@/hooks/use-mobile';
import { Clock, Coffee, Phone, X } from 'lucide-react';

interface StatusButtonsBarProps {
  currentStatus?: Profile['status'];
  onStatusChange: (newStatus: Profile['status']) => Promise<void>;
  variant?: 'default' | 'compact';
}

export const StatusButtonsBar: React.FC<StatusButtonsBarProps> = ({ 
  currentStatus = 'available', 
  onStatusChange,
  variant = 'default'
}) => {
  const isMobile = useIsMobile();
  const isCompact = variant === 'compact';
  
  const statuses = [
    { 
      id: 'available',
      icon: Clock,
      label: 'Disponible',
      mobileLabel: 'Dispo',
      color: 'from-green-400 to-green-600 hover:from-green-500 hover:to-green-700',
      inactiveColor: 'text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30'
    },
    { 
      id: 'busy',
      icon: Phone,
      label: 'En appel',
      mobileLabel: 'Appel',
      color: 'from-violet-400 to-violet-600 hover:from-violet-500 hover:to-violet-700',
      inactiveColor: 'text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30'
    },
    { 
      id: 'pause',
      icon: Coffee,
      label: 'En pause',
      mobileLabel: 'Pause',
      color: 'from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700',
      inactiveColor: 'text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30'
    },
    { 
      id: 'unavailable',
      icon: X,
      label: 'Indisponible',
      mobileLabel: 'Indispo',
      color: 'from-red-400 to-red-600 hover:from-red-500 hover:to-red-700',
      inactiveColor: 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
    }
  ];

  return (
    <div className="flex flex-wrap gap-1 sm:gap-2">
      {statuses.map(status => {
        const isActive = currentStatus === status.id;
        const Icon = status.icon;
        
        // Determine what label to show based on mobile and variant settings
        const displayLabel = isMobile ? status.mobileLabel : status.label;
        
        return (
          <button
            key={status.id}
            className={`
              flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-all
              ${isCompact ? 'text-xs' : 'text-sm'}
              ${isActive 
                ? `bg-gradient-to-r ${status.color} text-white font-medium shadow-sm` 
                : `${status.inactiveColor} bg-transparent dark:text-gray-300`}
            `}
            onClick={() => onStatusChange(status.id as Profile['status'])}
          >
            <Icon className={`${isCompact ? 'h-3 w-3' : 'h-4 w-4'}`} />
            <span>{displayLabel}</span>
          </button>
        );
      })}
    </div>
  );
};
