
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
    <span className={cn('text-sm font-medium text-gray-700', config.className)}>
      {config.label}
    </span>
  );
};
