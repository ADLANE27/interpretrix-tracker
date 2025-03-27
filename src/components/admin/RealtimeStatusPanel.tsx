
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getActiveChannelsStatus } from '@/lib/realtimeManager';
import { supabase } from '@/integrations/supabase/client';
import { 
  Activity, 
  Database, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const RealtimeStatusPanel = () => {
  const [channelsStatus, setChannelsStatus] = useState(getActiveChannelsStatus());
  const [enabledTables, setEnabledTables] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchEnabledTables = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('list_realtime_tables');
      if (error) throw error;
      
      const result: Record<string, boolean> = {};
      data.forEach((table: string) => {
        result[table] = true;
      });
      
      setEnabledTables(result);
    } catch (error) {
      console.error('Error fetching enabled tables:', error);
    } finally {
      setIsLoading(false);
      setLastRefreshed(new Date());
    }
  };

  const handleRefresh = () => {
    setChannelsStatus(getActiveChannelsStatus());
    fetchEnabledTables();
  };

  const enableTable = async (tableName: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('enable-realtime', {
        body: { table: tableName }
      });
      
      if (error) throw error;
      
      if (data.success) {
        setEnabledTables(prev => ({
          ...prev,
          [tableName]: true
        }));
      }
    } catch (error) {
      console.error(`Error enabling realtime for table ${tableName}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch enabled tables on mount
  useEffect(() => {
    fetchEnabledTables();
    
    // Set up an interval to refresh channel status
    const intervalId = setInterval(() => {
      setChannelsStatus(getActiveChannelsStatus());
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Get common tables that should be enabled
  const commonTables = [
    'interpreter_profiles',
    'interpretation_missions',
    'private_reservations',
    'chat_messages',
    'message_mentions'
  ];

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Statut des abonnements temps réel
          </div>
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {new Intl.DateTimeFormat('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }).format(lastRefreshed)}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="channels">
          <TabsList className="mb-4">
            <TabsTrigger value="channels">Canaux actifs</TabsTrigger>
            <TabsTrigger value="tables">Tables activées</TabsTrigger>
          </TabsList>
          
          <TabsContent value="channels" className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Canaux actifs</span>
              <Badge>{channelsStatus.count}</Badge>
            </div>
            
            <div className="max-h-80 overflow-y-auto space-y-2">
              {channelsStatus.channels.map(channel => (
                <div 
                  key={channel.name} 
                  className="bg-muted/50 p-2 rounded-md text-xs flex justify-between items-center"
                >
                  <div className="font-mono truncate max-w-[60%]">{channel.name}</div>
                  <div className="flex gap-2">
                    <Badge variant="secondary" size="sm">
                      {channel.refCount} {channel.refCount === 1 ? 'référence' : 'références'}
                    </Badge>
                    <Badge variant="outline" size="sm">
                      {channel.callbackCount} {channel.callbackCount === 1 ? 'callback' : 'callbacks'}
                    </Badge>
                  </div>
                </div>
              ))}
              
              {channelsStatus.channels.length === 0 && (
                <div className="text-center text-muted-foreground py-4">
                  Aucun canal actif
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="tables" className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Tables importantes</span>
              <Badge variant="outline">
                {Object.values(enabledTables).filter(Boolean).length} activées
              </Badge>
            </div>
            
            <div className="space-y-2">
              {commonTables.map(tableName => {
                const isEnabled = enabledTables[tableName];
                return (
                  <div 
                    key={tableName} 
                    className="flex justify-between items-center p-2 rounded-md bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{tableName}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isEnabled ? (
                        <Badge className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Activée
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Désactivée
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => enableTable(tableName)}
                            disabled={isLoading}
                          >
                            Activer
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
