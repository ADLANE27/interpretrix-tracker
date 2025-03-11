import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateChannelDialog } from "./CreateChannelDialog";
import { NewDirectMessageDialog } from "./NewDirectMessageDialog";
import { ChannelMemberManagement } from "./ChannelMemberManagement";
import { PlusCircle, Settings, UserPlus, ChevronLeft, Pencil, Trash2, Menu, Maximize2, Minimize2 } from 'lucide-react';
import { useIsMobile } from "@/hooks/use-mobile";
import { MessageListContainer } from "@/components/chat/MessageListContainer";
import { ChatInput } from "@/components/chat/ChatInput";
import { Message } from "@/types/messaging";
import { useQuery } from "@tanstack/react-query";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useChat } from "@/hooks/useChat";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Channel {
  id: string;
  display_name: string;
  description: string | null;
  channel_type: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface MessagesTabProps {
  onMenuClick?: () => void;
}

export const MessagesTab = ({ onMenuClick }: MessagesTabProps) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [message, setMessage] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDirectMessageDialog, setShowDirectMessageDialog] = useState(false);
  const [showMemberManagement, setShowMemberManagement] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showChannelList, setShowChannelList] = useState(true);
  const [editingChannel, setEditingChannel] = useState<{id: string, name: string} | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const { toast } = useToast();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();

  const fetchChannels = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .rpc('get_channels_with_display_names', {
          current_user_id: user.id
        }) as { data: Channel[] | null; error: any };

      if (error) throw error;
      if (data) {
        console.log('Fetched channels:', data);
        setChannels(data);
        if (data.length > 0 && !selectedChannel) {
          setSelectedChannel(data[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching channels:", error);
      toast({
        title: "Error",
        description: "Failed to fetch channels",
        variant: "destructive",
      });
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const {
    messages,
    isLoading,
    isSubscribed,
    sendMessage: sendMessageToChannel,
    deleteMessage,
    reactToMessage,
    currentUserId
  } = useChat(selectedChannel?.id || '');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  const handleDeleteChannel = async () => {
    if (!channelToDelete) return;

    try {
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('channel_id', channelToDelete.id);

      if (messagesError) throw messagesError;

      const { error: membersError } = await supabase
        .from('channel_members')
        .delete()
        .eq('channel_id', channelToDelete.id);

      if (membersError) throw membersError;

      const { error: channelError } = await supabase
        .from('chat_channels')
        .delete()
        .eq('id', channelToDelete.id);

      if (channelError) throw channelError;

      setChannels(channels.filter(c => c.id !== channelToDelete.id));
      if (selectedChannel?.id === channelToDelete.id) {
        setSelectedChannel(null);
      }

      toast({
        title: "Succès",
        description: "Le canal a été supprimé",
      });
    } catch (error) {
      console.error("Error deleting channel:", error);
      toast({
        title: "Erreur",
        description: "Échec de la suppression du canal",
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
      setChannelToDelete(null);
    }
  };

  const handleRename = async (channelId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('chat_channels')
        .update({ name: newName.trim() })
        .eq('id', channelId);

      if (error) throw error;

      setEditingChannel(null);
      
      toast({
        title: "Success",
        description: "Channel renamed successfully"
      });
    } catch (error) {
      console.error('Error renaming channel:', error);
      toast({
        title: "Error",
        description: "Failed to rename channel",
        variant: "destructive"
      });
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    const fileArray = Array.from(files);
    setAttachments(prev => [...prev, ...fileArray]);
  };

  const handleSendMessage = async () => {
    if ((!message.trim() && attachments.length === 0) || !selectedChannel?.id) return;

    try {
      await sendMessageToChannel(message, replyTo?.id, attachments);
      setMessage('');
      setAttachments([]);
      setReplyTo(null);
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => {
      const newAttachments = [...prev];
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  };

  const toggleFullScreen = () => {
    setIsFullScreen(prev => !prev);
  };

  return (
    <div className={cn(
      "grid grid-cols-1 lg:grid-cols-3 h-[100vh]",
      isFullScreen ? "fixed inset-0 z-50 bg-background" : "absolute inset-0",
    )}>
      {(!selectedChannel || showChannelList || !isMobile) && (
        <Card className={cn(
          "flex flex-col h-full",
          "bg-background/95 backdrop-blur-sm",
          "transition-opacity duration-200",
          "lg:border-r border-0",
          isMobile && "fixed inset-0 z-50"
        )}>
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-3 h-12">
              {isMobile && onMenuClick && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onMenuClick}
                  className="lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              )}
              <h2 className="text-base font-semibold">Conversations</h2>
            </div>
            <div className="px-3 pb-2">
              <Input
                placeholder="Rechercher un canal..."
                className="w-full"
              />
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-0.5 p-2">
                {channels.map((channel) => (
                  <div
                    key={channel.id}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-md cursor-pointer",
                      "hover:bg-accent/50 transition-colors",
                      selectedChannel?.id === channel.id ? 'bg-accent' : ''
                    )}
                    onClick={() => {
                      setSelectedChannel(channel);
                      if (isMobile) setShowChannelList(false);
                    }}
                  >
                    <span className="truncate text-sm font-medium">
                      {editingChannel?.id === channel.id ? (
                        <Input
                          value={editingChannel.name}
                          onChange={(e) => setEditingChannel({ ...editingChannel, name: e.target.value })}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') {
                              handleRename(channel.id, editingChannel.name);
                            } else if (e.key === 'Escape') {
                              setEditingChannel(null);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-8"
                          autoFocus
                        />
                      ) : (
                        channel.display_name
                      )}
                    </span>
                    {selectedChannel?.id === channel.id && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingChannel({ id: channel.id, name: channel.display_name });
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
                            setShowMemberManagement(true);
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
                            setChannelToDelete(channel);
                            setShowDeleteDialog(true);
                          }}
                          className="h-8 w-8 p-0 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </Card>
      )}
      
      {(selectedChannel && (!showChannelList || !isMobile)) ? (
        <Card className={cn(
          "flex flex-col h-full",
          "bg-background/95",
          "lg:col-span-2",
          "lg:border-0",
          isMobile && "fixed inset-0 z-50"
        )}>
          <div className="flex flex-col h-full">
            <div className="flex items-center h-12 px-3 border-b justify-between">
              <div className="flex items-center">
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowChannelList(true)}
                    className="mr-2"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                )}
                <h2 className="text-base font-semibold">{selectedChannel.display_name}</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullScreen}
                className="ml-2"
              >
                {isFullScreen ? (
                  <Minimize2 className="h-5 w-5" />
                ) : (
                  <Maximize2 className="h-5 w-5" />
                )}
              </Button>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <MessageListContainer
                messages={messages}
                currentUserId={currentUserId}
                onDeleteMessage={deleteMessage}
                onReactToMessage={reactToMessage}
                replyTo={replyTo}
                setReplyTo={setReplyTo}
                channelId={selectedChannel.id}
                filters={{}}
              />
            </div>

            <div className="border-t">
              <ChatInput
                message={message}
                setMessage={setMessage}
                onSendMessage={handleSendMessage}
                handleFileChange={handleFileChange}
                attachments={attachments}
                handleRemoveAttachment={handleRemoveAttachment}
                inputRef={inputRef}
                replyTo={replyTo}
                setReplyTo={setReplyTo}
              />
            </div>
          </div>
        </Card>
      ) : !selectedChannel && !isMobile ? (
        <Card className={cn(
          "flex items-center justify-center",
          "bg-background/95",
          "lg:col-span-2"
        )}>
          <div className="text-center text-muted-foreground">
            <p className="text-base font-light">
              Sélectionnez une conversation pour commencer à discuter
            </p>
          </div>
        </Card>
      ) : null}

      <CreateChannelDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onChannelCreated={fetchChannels}
      />
      <NewDirectMessageDialog
        isOpen={showDirectMessageDialog}
        onClose={() => setShowDirectMessageDialog(false)}
        onChannelCreated={fetchChannels}
      />
      {selectedChannel && (
        <ChannelMemberManagement
          isOpen={showMemberManagement}
          onClose={() => setShowMemberManagement(false)}
          channelId={selectedChannel.id}
        />
      )}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce canal ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Tous les messages et les données associés seront supprimés définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChannel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
