
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check, Database, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface TableInfo {
  table_name: string;
  is_realtime: boolean;
}

export const RealtimeStatusPanel: React.FC = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    fetchRealtimeTables();
  }, []);
  
  const fetchRealtimeTables = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('is_table_realtime_enabled', {
        table_name: 'interpreter_profiles'
      });
      
      if (error) throw error;
      
      // Since we don't have a list_realtime_tables RPC, we'll manually check key tables
      const tableNames = [
        'interpreter_profiles',
        'private_reservations',
        'interpretation_missions',
        'chat_messages',
        'message_mentions',
        'channel_members',
        'chat_channels'
      ];
      
      const tableChecks = await Promise.all(
        tableNames.map(async (tableName) => {
          const { data, error } = await supabase.rpc('is_table_realtime_enabled', {
            table_name: tableName
          });
          
          if (error) {
            console.error(`Error checking table ${tableName}:`, error);
            return { table_name: tableName, is_realtime: false };
          }
          
          return { table_name: tableName, is_realtime: data };
        })
      );
      
      setTables(tableChecks);
    } catch (error) {
      console.error("Error fetching realtime tables:", error);
      toast({
        title: "Error",
        description: "Failed to fetch realtime tables status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const enableRealtimeForTable = async (tableName: string) => {
    try {
      setRefreshing(tableName);
      
      const { data, error } = await supabase.functions.invoke('enable-realtime', {
        body: { table: tableName }
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Realtime enabled for table "${tableName}"`,
      });
      
      // Refresh the list
      fetchRealtimeTables();
    } catch (error) {
      console.error(`Error enabling realtime for ${tableName}:`, error);
      toast({
        title: "Error",
        description: `Failed to enable realtime for "${tableName}"`,
        variant: "destructive"
      });
    } finally {
      setRefreshing(null);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium">
            Realtime Status
          </CardTitle>
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={fetchRealtimeTables}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[240px] pr-4">
          {loading ? (
            <div className="flex justify-center items-center h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {tables.map((table) => (
                <div key={table.table_name} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{table.table_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {table.is_realtime ? (
                      <Badge variant="secondary">
                        <Check className="h-3 w-3 mr-1" /> Enabled
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <span className="mr-1">Disabled</span>
                      </Badge>
                    )}
                    {!table.is_realtime && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => enableRealtimeForTable(table.table_name)}
                        disabled={refreshing === table.table_name}
                        className="h-7 px-2"
                      >
                        {refreshing === table.table_name ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Enable"
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
