
import React from 'react';
import { Heart, ExternalLink } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

export const Footer = () => {
  const { theme } = useTheme();
  const year = new Date().getFullYear();
  
  return (
    <footer className={cn(
      "w-full py-3 px-4 border-t border-border",
      "bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm",
      "text-xs text-gray-500 dark:text-gray-400",
      "flex flex-col sm:flex-row items-center justify-between gap-2",
      "z-10"
    )}>
      <div className="flex items-center gap-1">
        <span>© {year} Interpretix</span>
        <span className="hidden sm:inline-block">•</span>
        <span className="hidden sm:inline-block">Tous droits réservés</span>
      </div>
      
      <div className="flex items-center gap-4">
        <a 
          href="#" 
          className="hover:text-primary transition-colors flex items-center gap-1"
        >
          <span>Politique de confidentialité</span>
        </a>
        <a 
          href="#" 
          className="hover:text-primary transition-colors flex items-center gap-1"
        >
          <span>Conditions d'utilisation</span>
        </a>
        <a 
          href="#" 
          className="hover:text-primary transition-colors flex items-center gap-1"
        >
          <span>Aide</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </footer>
  );
};
