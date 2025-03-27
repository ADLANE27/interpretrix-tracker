
import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, WifiOff } from 'lucide-react';

interface ConnectionStatusNotificationProps {
  connectionError: boolean;
  reconnectingFor: number;
  isForceReconnecting: boolean;
  onForceReconnect: () => void;
}

export function ConnectionStatusNotification({
  connectionError,
  reconnectingFor,
  isForceReconnecting,
  onForceReconnect
}: ConnectionStatusNotificationProps) {
  if (!connectionError) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-amber-100 border border-amber-400 text-amber-700 px-4 py-3 rounded-md shadow-lg z-50 flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {isForceReconnecting ? (
            <Loader2 className="animate-spin h-4 w-4 mr-2" />
          ) : (
            <WifiOff className="h-4 w-4 mr-2" />
          )}
          <span className="font-medium">Reconnexion en cours...</span>
        </div>
        <span className="text-xs ml-2 bg-amber-200 px-1.5 py-0.5 rounded-full">{reconnectingFor}s</span>
      </div>
      {reconnectingFor > 10 && !isForceReconnecting && (
        <Button 
          variant="outline"
          size="sm"
          onClick={onForceReconnect}
          className="mt-2 text-xs bg-amber-200 hover:bg-amber-300 text-amber-800 border-amber-300"
          disabled={isForceReconnecting}
        >
          {isForceReconnecting ? (
            <>
              <Loader2 className="animate-spin h-3 w-3 mr-1" />
              Reconnexion...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-1" />
              Forcer la reconnexion
            </>
          )}
        </Button>
      )}
    </div>
  );
}
