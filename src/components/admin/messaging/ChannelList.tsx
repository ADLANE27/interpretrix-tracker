import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  type: "admin_only" | "internal" | "external" | "mixed";
  created_at: string;
}

interface ChannelListProps {
  onChannelSelect: (channelId: string) => void;
}

export const ChannelList = ({ onChannelSelect }: ChannelListProps) => {
  const { toast } = useToast();

  const { data: channels, isLoading } = useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load channels",
          variant: "destructive",
        });
        throw error;
      }

      return data as Channel[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("channel-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "channels",
        },
        () => {
          // Invalidate and refetch channels
          void queryClient.invalidateQueries({ queryKey: ["channels"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isLoading) {
    return <div>Loading channels...</div>;
  }

  return (
    <ScrollArea className="h-[600px] rounded-lg border">
      <div className="p-4 space-y-2">
        {channels?.map((channel) => (
          <Button
            key={channel.id}
            variant="ghost"
            className="w-full justify-start"
            onClick={() => onChannelSelect(channel.id)}
          >
            <div className="truncate">
              <div className="font-medium">{channel.name}</div>
              {channel.description && (
                <div className="text-sm text-gray-500 truncate">
                  {channel.description}
                </div>
              )}
            </div>
          </Button>
        ))}
      </div>
    </ScrollArea>
  );
};