import { Badge } from "@/components/ui/badge";
import { Channel } from "@/hooks/chat/useChannels";

interface ChannelListItemProps {
  channel: Channel;
  isSelected: boolean;
  unreadCount?: number;
  onClick: () => void;
}

export const ChannelListItem = ({ 
  channel, 
  isSelected, 
  unreadCount, 
  onClick 
}: ChannelListItemProps) => {
  return (
    <div
      className={`
        flex items-center justify-between p-2 rounded-lg 
        cursor-pointer transition-colors
        ${isSelected ? 'bg-interpreter-navy text-white' : 'hover:bg-accent/50'}
      `}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 flex-1">
        <span className="font-medium">{channel.name}</span>
        {unreadCount && unreadCount > 0 && (
          <Badge variant="destructive" className="ml-2">
            {unreadCount}
          </Badge>
        )}
      </div>
    </div>
  );
};