
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  status: 'connected' | 'connecting' | 'disconnected';
}

export const ConnectionStatus = ({ status }: ConnectionStatusProps) => {
  const statusConfig = {
    connected: {
      label: 'Connecté',
      className: 'text-green-500',
    },
    connecting: {
      label: 'Connexion en cours...',
      className: 'text-yellow-500 animate-pulse',
    },
    disconnected: {
      label: 'Déconnecté',
      className: 'text-red-500',
    },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/50 backdrop-blur-sm">
      <span className={cn('text-sm font-medium text-gray-700', config.className)}>{config.label}</span>
    </div>
  );
};
