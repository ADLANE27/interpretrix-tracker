
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { InterpreterChannelList } from "./chat/InterpreterChannelList";
import { InterpreterChat } from "./chat/InterpreterChat";
import { MessageSquare } from "lucide-react";
import { ChatFilters } from "@/components/chat/ChatFilters";

export const MessagingTab = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [filters, setFilters] = useState<{
    userId?: string;
    keyword?: string;
    date?: Date;
  }>({});

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-300px)] min-h-[600px]">
      <Card className="p-4 md:col-span-1 shadow-md border-0 overflow-hidden">
        <div className="flex items-center gap-2 mb-4 px-2">
          <MessageSquare className="h-5 w-5 text-interpreter-navy" />
          <h2 className="text-lg font-semibold text-interpreter-navy">Messages</h2>
        </div>
        <InterpreterChannelList 
          onChannelSelect={setSelectedChannelId}
        />
      </Card>
      
      {selectedChannelId ? (
        <Card className="p-4 md:col-span-2 shadow-md border-0 overflow-hidden">
          <InterpreterChat 
            channelId={selectedChannelId}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
          />
        </Card>
      ) : (
        <Card className="p-4 md:col-span-2 shadow-md border-0 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Select a channel to start messaging</p>
          </div>
        </Card>
      )}
    </div>
  );
};

