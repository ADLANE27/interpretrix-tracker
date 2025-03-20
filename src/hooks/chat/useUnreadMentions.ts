
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { playNotificationSound } from "@/utils/notificationSound";
import { useBrowserNotification } from "@/hooks/useBrowserNotification";

export interface UnreadMention {
  mention_id: string;
  message_id: string;
  channel_id: string;
  message_content: string;
  mentioning_user_name: string;
  created_at: Date;
}

interface UnreadMentionResponse {
  id: string;
  message_id: string;
  channel_id: string;
  chat_messages: {
    content: string;
    sender_id: string;
  };
  created_at: string;
}

export const useUnreadMentions = () => {
  const [unreadMentions, setUnreadMentions] = useState<UnreadMention[]>([]);
  const [unreadDirectMessages, setUnreadDirectMessages] = useState<number>(0);
  const [totalUnreadCount, setTotalUnreadCount] = useState<number>(0);
  const [lastMentionId, setLastMentionId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const { showNotification, requestPermission } = useBrowserNotification();

  // Request notification permission when the hook is first used
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  // Determine the user role early and store current user ID
  useEffect(() => {
    const getUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setCurrentUserId(user.id);

        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          setUserRole(data.role);
          console.log(`[Mentions Debug] User role determined: ${data.role}`);
        }
      } catch (error) {
        console.error("[Mentions Debug] Error determining user role:", error);
      }
    };

    getUserRole();
  }, []);

  const fetchUnreadMentions = useCallback(async () => {
    console.log(`[Mentions Debug] Fetching unread mentions... (Role: ${userRole || 'unknown'})`);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[Mentions Debug] No authenticated user found');
        setUnreadMentions([]);
        setUnreadDirectMessages(0);
        setTotalUnreadCount(0);
        return;
      }

      console.log('[Mentions Debug] Fetching mentions for user:', user.id);
      
      // Fetch unread mentions where the current user is the mentioned user (not the sender)
      const { data: mentionsData, error: mentionsError } = await supabase
        .from('message_mentions')
        .select(`
          id,
          message_id,
          channel_id,
          chat_messages (
            content,
            sender_id
          ),
          created_at
        `)
        .eq('mentioned_user_id', user.id)
        .eq('status', 'unread')
        .order('created_at', { ascending: false });

      if (mentionsError) {
        console.error('[Mentions Debug] Error fetching unread mentions:', mentionsError);
        return;
      }

      console.log('[Mentions Debug] Raw mentions data:', mentionsData?.length || 0, 'mentions');

      // Fetch unread direct messages count
      const { data: directChannels, error: channelsError } = await supabase
        .from('chat_channels')
        .select('id')
        .eq('channel_type', 'direct');

      if (channelsError) {
        console.error('[DM Debug] Error fetching direct channels:', channelsError);
        return;
      }

      const channelIds = directChannels.map(channel => channel.id);
      
      // Get the last read timestamp for each channel
      const { data: memberData } = await supabase
        .from('channel_members')
        .select('channel_id, last_read_at')
        .eq('user_id', user.id)
        .in('channel_id', channelIds);

      const lastReadMap = new Map(
        memberData?.map(member => [member.channel_id, member.last_read_at]) || []
      );

      // Count unread messages in direct channels
      let unreadDMCount = 0;
      for (const channelId of channelIds) {
        const lastRead = lastReadMap.get(channelId);
        if (!lastRead) continue;

        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('channel_id', channelId)
          .gt('created_at', lastRead)
          .neq('sender_id', user.id);

        if (count) unreadDMCount += count;
      }

      // Process mentions with sender names
      const mentionsWithNames = await Promise.all(
        (mentionsData as UnreadMentionResponse[] || [])
          .filter(mention => mention.chat_messages) // Only include mentions with existing messages
          .map(async (mention) => {
            console.log('[Mentions Debug] Processing mention:', mention.id);
            
            // Make sure we're not processing mentions where the current user is the sender
            if (mention.chat_messages.sender_id === user.id) {
              console.log('[Mentions Debug] Skipping mention created by current user');
              return null;
            }
            
            // Get sender details using the rpc function that works for both interpreters and admins
            const { data: senderData, error: senderError } = await supabase
              .rpc('get_message_sender_details', {
                sender_id: mention.chat_messages.sender_id
              });

            if (senderError) {
              console.error('[Mentions Debug] Error getting sender details:', senderError);
              return null;
            }

            if (!senderData || senderData.length === 0) {
              console.error('[Mentions Debug] No sender data found for:', mention.chat_messages.sender_id);
              return null;
            }

            const senderName = senderData[0]?.name || 'Unknown User';
            console.log('[Mentions Debug] Sender name retrieved:', senderName);

            return {
              mention_id: mention.id,
              message_id: mention.message_id,
              channel_id: mention.channel_id,
              message_content: mention.chat_messages.content || '',
              mentioning_user_name: senderName,
              created_at: new Date(mention.created_at)
            };
          })
      );

      // Filter out null values and ensure we have valid mentions
      const validMentions = mentionsWithNames.filter(mention => mention !== null) as UnreadMention[];

      console.log('[Mentions Debug] Processed mentions:', validMentions.length);
      
      // Check if there's a new mention to show notification
      if (validMentions.length > 0) {
        const newestMention = validMentions[0];
        
        // If this is a new mention that we haven't seen before, show a notification
        if (lastMentionId !== newestMention.mention_id) {
          console.log('[Mentions Debug] New mention detected:', newestMention.mention_id);
          setLastMentionId(newestMention.mention_id);
          
          // If this isn't the first load (lastMentionId is set), show notification
          if (lastMentionId !== null) {
            console.log('[Mentions Debug] Showing notification for mention from:', newestMention.mentioning_user_name);
            
            // Play sound for new mention
            playNotificationSound();
            
            // Show toast notification
            toast({
              title: "Nouvelle mention",
              description: `${newestMention.mentioning_user_name} vous a mentionné`,
              variant: "default",
            });
            
            // Show browser notification
            showNotification(
              "Nouvelle mention", 
              { 
                body: `${newestMention.mentioning_user_name} vous a mentionné: ${newestMention.message_content}`
              }
            );
          }
        }
      }
      
      setUnreadMentions(validMentions);
      setUnreadDirectMessages(unreadDMCount);
      setTotalUnreadCount(validMentions.length + unreadDMCount);

      console.log('[Mentions Debug] Updated counts:', {
        mentions: validMentions.length,
        dms: unreadDMCount,
        total: validMentions.length + unreadDMCount,
        userRole
      });
    } catch (error) {
      console.error('[Mentions Debug] Error in fetchUnreadMentions:', error);
    }
  }, [lastMentionId, showNotification, userRole, toast]);

  const markMentionAsRead = async (mentionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('[Mentions Debug] Marking mention as read:', mentionId);
      const { error } = await supabase
        .from('message_mentions')
        .update({ status: 'read' })
        .eq('id', mentionId)
        .eq('mentioned_user_id', user.id);

      if (error) {
        console.error('[Mentions Debug] Error marking mention as read:', error);
        throw error;
      }
      
      console.log('[Mentions Debug] Successfully marked mention as read');
      await fetchUnreadMentions();
    } catch (error) {
      console.error('[Mentions Debug] Error marking mention as read:', error);
    }
  };

  const deleteMention = async (mentionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('[Mentions Debug] Deleting mention:', mentionId);
      const { error } = await supabase
        .from('message_mentions')
        .update({ status: 'deleted' })
        .eq('id', mentionId)
        .eq('mentioned_user_id', user.id);

      if (error) {
        console.error('[Mentions Debug] Error deleting mention:', error);
        throw error;
      }

      console.log('[Mentions Debug] Successfully deleted mention');
      await fetchUnreadMentions();
    } catch (error) {
      console.error('[Mentions Debug] Error deleting mention:', error);
    }
  };

  const markAllMentionsAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('[Mentions Debug] Marking all mentions as read');
      const { error } = await supabase
        .from('message_mentions')
        .update({ status: 'read' })
        .eq('mentioned_user_id', user.id)
        .eq('status', 'unread');

      if (error) {
        console.error('[Mentions Debug] Error marking all mentions as read:', error);
        throw error;
      }

      console.log('[Mentions Debug] Successfully marked all mentions as read');
      await fetchUnreadMentions();
    } catch (error) {
      console.error('[Mentions Debug] Error marking all mentions as read:', error);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchUnreadMentions();

    // Set up a regular refresh interval for mentions
    const intervalId = setInterval(() => {
      fetchUnreadMentions();
    }, 30000); // Refresh every 30 seconds

    // Create a single channel for all subscriptions
    if (currentUserId) {
      console.log('[Mentions Debug] Setting up real-time subscriptions for user:', currentUserId);
      
      const channel = supabase.channel('mentions-and-messages')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'message_mentions' },
          (payload) => {
            console.log(`[Mentions Debug] Message mentions table changed (role: ${userRole})`, payload);
            
            // Type safety for payload.new
            if (payload.new && 
                typeof payload.new === 'object' && 
                'mentioned_user_id' in payload.new) {
              
              // Only refresh if the mention is for the current user
              if (payload.new.mentioned_user_id === currentUserId) {
                console.log('[Mentions Debug] Refreshing mentions - this mention is for current user');
                fetchUnreadMentions();
              } else {
                console.log('[Mentions Debug] Ignoring mention - not for current user');
              }
            } else {
              // If there's no payload.new or it's not correctly structured, 
              // refresh mentions anyway in case it's an update or delete operation
              console.log('[Mentions Debug] Refreshing mentions after table change - no payload details');
              fetchUnreadMentions();
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages' },
          (payload) => {
            console.log(`[Messages Debug] New message received (role: ${userRole})`, payload);
            
            // Refresh mentions when new messages come in
            // This ensures we catch any potential mentions that might have been processed
            // after the real-time trigger completes
            fetchUnreadMentions();
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'channel_members' },
          (payload) => {
            console.log(`[Messages Debug] Channel membership updated (role: ${userRole})`, payload);
            fetchUnreadMentions();
          }
        )
        .subscribe((status) => {
          console.log(`[Mentions Debug] Subscription status (role: ${userRole}):`, status);
        });

      return () => {
        console.log('[Mentions Debug] Cleaning up subscription and interval');
        clearInterval(intervalId);
        supabase.removeChannel(channel);
      };
    }

    // Cleanup function for the interval if currentUserId is not available yet
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchUnreadMentions, userRole, currentUserId]);

  return { 
    unreadMentions, 
    totalUnreadCount,
    unreadDirectMessages,
    markMentionAsRead,
    deleteMention,
    markAllMentionsAsRead,
    refreshMentions: fetchUnreadMentions 
  };
};
