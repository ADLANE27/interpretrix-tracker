import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { CreateChannelDialog } from "./CreateChannelDialog";
import { NewDirectMessageDialog } from "./NewDirectMessageDialog";
import { ChannelMemberManagement } from "./ChannelMemberManagement";
import { PlusCircle, Settings, Paperclip, Send, Smile, Trash2, MessageSquare, UserPlus, ChevronDown, ChevronRight, ChevronLeft, Pencil } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MessageAttachment } from "@/components/chat/MessageAttachment";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTimestampFormat } from "@/hooks/useTimestampFormat";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useChat } from "@/hooks/useChat"; 
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Chat from "@/components/chat/Chat";
import { motion, AnimatePresence } from "framer-motion";

interface Channel {
  id: string;
  display_name: string;
  description: string | null;
  channel_type: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export const MessagesTab = () => {
  const { formatMessageTime } = useTimestampFormat();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDirectMessageDialog, setShowDirectMessageDialog] = useState(false);
  const [showMemberManagement, setShowMemberManagement] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const [showChannelList, setShowChannelList] = useState(true);
  const [editingChannel, setEditingChannel] = useState<{id: string, name: string} | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const currentUser = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      currentUser.current = user;
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    const fetchChannels = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
          .rpc('get_channels_with_display_names', {
            current_user_id: user.id
          }) as { data: Channel[] | null; error: any };

        if (error) throw error;
        if (data) {
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchChannels();
  }, []);

  const handleChannelCreated = () => {
    const fetchChannels = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
          .rpc('get_channels_with_display_names', {
            current_user_id: user.id
          }) as { data: Channel[] | null; error: any };

        if (error) throw error;
        if (data) {
          setChannels(data);
        }
      } catch (error) {
        console.error("Error fetching channels:", error);
        toast({
          title: "Error",
          description: "Failed to fetch channels",
          variant: "destructive",
        });
      }
    };
    fetchChannels();
  };

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
      
      setChannels(channels.map(channel => 
        channel.id === channelId 
          ? { ...channel, display_name: newName.trim() }
          : channel
      ));
      
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

  if (isLoading && channels.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-lg text-muted-foreground"
        >
          Loading channels...
        </motion.p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] overflow-hidden bg-background">
      <div className="flex h-full">
        <AnimatePresence>
          {(isMobile ? showChannelList : true) && (
            <motion.div 
              initial={isMobile ? { x: -300, opacity: 0 } : { opacity: 1 }}
              animate={{ x: 0, opacity: 1 }}
              exit={isMobile ? { x: -300, opacity: 0 } : { opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={`${
                isMobile 
                  ? showChannelList 
                    ? 'absolute inset-0 z-30 bg-background' 
                    : 'hidden'
                  : 'w-80'
              } border-r flex flex-col`}
            >
              <div className="p-4 border-b safe-area-top bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Canaux</h2>
                  <div className="flex gap-2">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDirectMessageDialog(true)}
                        className="h-9 w-9 p-0 rounded-full"
                      >
                        <UserPlus className="h-5 w-5" />
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCreateDialog(true)}
                        className="h-9 w-9 p-0 rounded-full"
                      >
                        <PlusCircle className="h-5 w-5" />
                      </Button>
                    </motion.div>
                  </div>
                </div>
                <Input
                  placeholder="Rechercher un canal..."
                  className="w-full"
                />
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {channels.map((channel, index) => (
                  <motion.div
                    key={channel.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.2 }}
                  >
                    <motion.div
                      whileHover={{ scale: 1.01, backgroundColor: 'rgba(0,0,0,0.02)' }}
                      transition={{ duration: 0.2 }}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                        selectedChannel?.id === channel.id ? 'bg-accent shadow-sm' : ''
                      }`}
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
                            className="h-8 w-8 p-0 rounded-full"
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
                            className="h-8 w-8 p-0 rounded-full"
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
                            className="h-8 w-8 p-0 text-destructive rounded-full"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`flex-1 flex flex-col ${isMobile && !showChannelList ? 'absolute inset-0 z-20 bg-background' : ''}`}>
          {selectedChannel ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col h-full"
            >
              {isMobile && (
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowChannelList(true)}
                    className="h-9 w-9 p-0 absolute top-4 left-4 z-10 rounded-full bg-background/80 backdrop-blur-sm shadow-sm"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                </motion.div>
              )}
              
              <Chat 
                channelId={selectedChannel.id} 
                userRole="admin"
              />
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex items-center justify-center text-muted-foreground p-4 text-center"
            >
              <p>Sélectionnez un canal pour commencer à discuter</p>
            </motion.div>
          )}
        </div>
      </div>

      <CreateChannelDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onChannelCreated={handleChannelCreated}
      />
      <NewDirectMessageDialog
        isOpen={showDirectMessageDialog}
        onClose={() => setShowDirectMessageDialog(false)}
        onChannelCreated={handleChannelCreated}
      />
      {selectedChannel && (
        <ChannelMemberManagement
          isOpen={showMemberManagement}
          onClose={() => setShowMemberManagement(false)}
          channelId={selectedChannel.id}
        />
      )}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="sm:max-w-[425px]">
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
