
import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft } from 'lucide-react';

interface MessagesHeaderProps {
  selectedChannelName: string;
  isMobile: boolean;
  onShowChannelList: () => void;
}

export const MessagesHeader: React.FC<MessagesHeaderProps> = ({
  selectedChannelName,
  isMobile,
  onShowChannelList,
}) => {
  return (
    <div className="p-4 border-b safe-area-top bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3">
        {isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowChannelList}
            className="h-9 w-9 p-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <h2 className="text-lg font-semibold flex-1">{selectedChannelName}</h2>
      </div>
    </div>
  );
};
