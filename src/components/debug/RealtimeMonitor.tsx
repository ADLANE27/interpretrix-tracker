
import { useState, useEffect } from 'react';
import { getActiveChannelsStatus } from '@/lib/realtimeManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { enabledTablesCache } from '@/lib/realtimeManager';

export const RealtimeMonitor = () => {
  const [status, setStatus] = useState(() => getActiveChannelsStatus());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setStatus(getActiveChannelsStatus());
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  return (
    <Card className="max-w-xl">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">Realtime Subscriptions</CardTitle>
          <Badge variant="outline">{status.count} active channels</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsExpanded(!isExpanded)} 
          className="mb-2 w-full"
        >
          {isExpanded ? 'Hide Details' : 'Show Details'}
        </Button>
        
        {isExpanded && (
          <div className="space-y-3 text-sm">
            {status.channels.map(channel => (
              <div key={channel.name} className="flex items-center justify-between bg-muted/50 p-2 rounded">
                <div className="overflow-hidden overflow-ellipsis">
                  <span className="font-mono">{channel.name}</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {channel.refCount} ref{channel.refCount !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {channel.callbackCount} callback{channel.callbackCount !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
