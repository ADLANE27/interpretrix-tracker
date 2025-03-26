
import React from 'react';

interface LanguageBadgeProps {
  source: string;
  target: string;
}

export const LanguageBadge: React.FC<LanguageBadgeProps> = ({ source, target }) => {
  return (
    <div className="px-1.5 py-0.5 bg-gradient-to-r from-palette-soft-blue to-palette-soft-purple text-slate-700 rounded text-[11px] flex items-center gap-0.5">
      <span>{source}</span>
      <span className="text-palette-vivid-purple">→</span>
      <span>{target}</span>
    </div>
  );
};
