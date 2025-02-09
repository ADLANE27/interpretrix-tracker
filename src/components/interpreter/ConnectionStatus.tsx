
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  status: 'connected' | 'connecting' | 'disconnected';
}

export const ConnectionStatus = ({ status }: ConnectionStatusProps) => {
  const statusConfig = {
    connected: {
      icon: Wifi,
      label: 'Connecté',
      className: 'text-green-500',
    },
    connecting: {
      icon: Wifi,
      label: 'Connexion en cours...',
      className: 'text-yellow-500 animate-pulse',
    },
    disconnected: {
      icon: WifiOff,
      label: 'Déconnecté',
      className: 'text-red-500',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/50 backdrop-blur-sm">
      <Icon className={cn('h-4 w-4', config.className)} />
      <span className="text-sm font-medium text-gray-700">{config.label}</span>
    </div>
  );
};
