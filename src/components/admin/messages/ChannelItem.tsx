
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Settings, Trash2 } from 'lucide-react';

interface Channel {
  id: string;
  display_name: string;
  description: string | null;
  channel_type: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface ChannelItemProps {
  channel: Channel;
  selectedChannelId?: string;
  editingChannel: { id: string; name: string } | null;
  onSelectChannel: (channel: Channel) => void;
  onEditChannel: (channelId: string, displayName: string) => void;
  onUpdateEditName: (name: string) => void;
  onSaveRename: (channelId: string, newName: string) => void;
  onCancelEdit: () => void;
  onManageMembers: () => void;
  onDeleteChannel: (channel: Channel) => void;
}

export const ChannelItem: React.FC<ChannelItemProps> = ({
  channel,
  selectedChannelId,
  editingChannel,
  onSelectChannel,
  onEditChannel,
  onUpdateEditName,
  onSaveRename,
  onCancelEdit,
  onManageMembers,
  onDeleteChannel,
}) => {
  const isSelected = selectedChannelId === channel.id;
  const isEditing = editingChannel?.id === channel.id;

  const handleClick = () => {
    onSelectChannel(channel);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter' && editingChannel) {
      onSaveRename(channel.id, editingChannel.name);
    } else if (e.key === 'Escape') {
      onCancelEdit();
    }
  };

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors ${
        isSelected ? 'bg-accent' : ''
      }`}
      onClick={handleClick}
    >
      <span className="truncate text-sm font-medium">
        {isEditing ? (
          <Input
            value={editingChannel.name}
            onChange={(e) => onUpdateEditName(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="h-8"
            autoFocus
          />
        ) : (
          channel.display_name
        )}
      </span>
      {isSelected && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEditChannel(channel.id, channel.display_name);
            }}
            className="h-8 w-8 p-0"
          >
            <Pencil className="h-4 w-4 text-gray-500 hover:text-blue-500" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onManageMembers();
            }}
            className="h-8 w-8 p-0"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteChannel(channel);
            }}
            className="h-8 w-8 p-0 text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
