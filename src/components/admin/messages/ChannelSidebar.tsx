
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, UserPlus } from 'lucide-react';
import { ChannelItem } from './ChannelItem';

interface Channel {
  id: string;
  display_name: string;
  description: string | null;
  channel_type: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface ChannelSidebarProps {
  channels: Channel[];
  selectedChannel: Channel | null;
  editingChannel: { id: string; name: string } | null;
  isMobile: boolean;
  showChannelList: boolean;
  onSelectChannel: (channel: Channel) => void;
  onShowCreateDialog: () => void;
  onShowDirectMessageDialog: () => void;
  onShowMemberManagement: () => void;
  onRenameChannel: (channelId: string, newName: string) => void;
  onSetEditingChannel: (channel: { id: string; name: string } | null) => void;
  onDeleteChannel: (channel: Channel) => void;
}

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  channels,
  selectedChannel,
  editingChannel,
  isMobile,
  showChannelList,
  onSelectChannel,
  onShowCreateDialog,
  onShowDirectMessageDialog,
  onShowMemberManagement,
  onRenameChannel,
  onSetEditingChannel,
  onDeleteChannel,
}) => {
  return (
    <div 
      className={`${
        isMobile 
          ? showChannelList 
            ? 'absolute inset-0 z-30 bg-background' 
            : 'hidden'
          : 'w-80'
      } border-r flex flex-col`}
    >
      <div className="p-4 border-b safe-area-top bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Canaux</h2>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowDirectMessageDialog}
              className="h-9 w-9 p-0"
            >
              <UserPlus className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowCreateDialog}
              className="h-9 w-9 p-0"
            >
              <PlusCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <Input
          placeholder="Rechercher un canal..."
          className="w-full"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {channels.map((channel) => (
          <ChannelItem
            key={channel.id}
            channel={channel}
            selectedChannelId={selectedChannel?.id}
            editingChannel={editingChannel}
            onSelectChannel={onSelectChannel}
            onEditChannel={(channelId, name) => 
              onSetEditingChannel({ id: channelId, name })
            }
            onUpdateEditName={(name) => 
              onSetEditingChannel(editingChannel ? { ...editingChannel, name } : null)
            }
            onSaveRename={onRenameChannel}
            onCancelEdit={() => onSetEditingChannel(null)}
            onManageMembers={onShowMemberManagement}
            onDeleteChannel={onDeleteChannel}
          />
        ))}
      </div>
    </div>
  );
};
