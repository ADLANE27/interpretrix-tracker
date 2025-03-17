
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Attachment } from '@/types/messaging';
import type { Json } from '@/integrations/supabase/types';
import { CONNECTION_CONSTANTS } from '../supabase-connection/constants';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB limit
const ALLOWED_FILE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

// Queue for pending messages during offline or failure scenarios
interface PendingMessage {
  id: string;            // Temporary client-side ID
  content: string;
  parentMessageId?: string | null;
  files: File[];
  createdAt: Date;
  retryCount: number;
  status: 'pending' | 'sending' | 'failed';
}

const sanitizeFilename = (filename: string): string => {
  // Create a mapping of accented characters to their non-accented equivalents
  const accentMap: { [key: string]: string } = {
    'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a',
    'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
    'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
    'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
    'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
    'ý': 'y', 'ÿ': 'y',
    'ñ': 'n',
    'ç': 'c'
  };

  // Extract extension
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  // Process the name without extension
  let nameWithoutExt = filename.slice(0, -(ext.length + 1)).toLowerCase();
  
  // Replace accented characters
  nameWithoutExt = nameWithoutExt.split('').map(char => accentMap[char] || char).join('');
  
  // Remove any remaining non-alphanumeric characters
  nameWithoutExt = nameWithoutExt
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    || 'file';

  // Add uniqueness with timestamp and random string
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 6);
  
  // Clean extension and construct final filename
  const cleanExt = ext.replace(/[^a-z0-9]/g, '');

  const finalName = `${nameWithoutExt}_${timestamp}_${randomString}.${cleanExt}`;
  
  console.log('[Chat] Filename sanitization:', {
    original: filename,
    sanitized: finalName
  });

  return finalName;
};

const validateFile = (file: File): string | null => {
  if (!file) return 'No file provided';
  if (file.size > MAX_FILE_SIZE) return 'File is too large (max 100MB)';
  if (!ALLOWED_FILE_TYPES.has(file.type)) return 'File type not supported';
  return null;
};

export const useMessageActions = (
  channelId: string,
  currentUserId: string | null,
  fetchMessages: () => Promise<void>,
  hasConnectivityIssue?: boolean
) => {
  const { toast } = useToast();
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const uploadAttachment = async (file: File): Promise<Attachment> => {
    // Validate file before upload
    const validationError = validateFile(file);
    if (validationError) {
      console.error('[Chat] File validation error:', validationError);
      throw new Error(validationError);
    }

    const sanitizedFilename = sanitizeFilename(file.name);
    console.log('[Chat] Uploading file with sanitized name:', sanitizedFilename);
    
    let retries = 3;
    while (retries > 0) {
      try {
        // Track upload progress (using XHR since fetch doesn't support progress)
        const progressTracker = (uploadId: string): () => void => {
          // Simulate progress as best we can
          let currentProgress = 0;
          const interval = setInterval(() => {
            currentProgress += Math.random() * 20;
            if (currentProgress > 95) {
              currentProgress = 95; // Cap at 95% until complete
              clearInterval(interval);
            }
            setUploadProgress(prev => ({
              ...prev,
              [uploadId]: Math.min(Math.round(currentProgress), 95)
            }));
          }, 300);
          
          return () => {
            clearInterval(interval);
            setUploadProgress(prev => ({
              ...prev,
              [uploadId]: 100 // Mark as complete
            }));
          };
        };
        
        const uploadId = `${sanitizedFilename}-${Date.now()}`;
        const cleanupProgress = progressTracker(uploadId);

        const { data, error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(sanitizedFilename, file, {
            cacheControl: '3600',
            upsert: false
          });

        cleanupProgress(); // Mark as complete regardless of result

        if (uploadError) {
          console.error('[Chat] Upload error:', uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(sanitizedFilename);

        console.log('[Chat] Upload successful:', {
          originalName: file.name,
          sanitizedName: sanitizedFilename,
          publicUrl
        });
        
        // Remove from progress tracking
        setUploadProgress(prev => {
          const updated = { ...prev };
          delete updated[uploadId];
          return updated;
        });

        return {
          url: publicUrl,
          filename: file.name, // Keep original filename for display
          type: file.type,
          size: file.size
        };
      } catch (error) {
        console.error(`[Chat] Upload attempt ${4 - retries} failed:`, error);
        retries--;
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
      }
    }
    throw new Error('Upload failed after all retries');
  };

  // Process pending messages that failed to send
  const processMessageQueue = async (): Promise<void> => {
    if (pendingMessages.length === 0 || hasConnectivityIssue) {
      return;
    }

    const pendingMessage = pendingMessages[0];
    if (pendingMessage.status === 'sending') {
      return; // Already being processed
    }

    try {
      console.log('[Chat] Processing pending message:', pendingMessage);
      
      // Mark message as sending
      setPendingMessages(prev => 
        prev.map(msg => 
          msg.id === pendingMessage.id 
            ? { ...msg, status: 'sending' } 
            : msg
        )
      );

      // Attempt to send message
      await sendMessage(
        pendingMessage.content, 
        pendingMessage.parentMessageId, 
        pendingMessage.files
      );
      
      // If successful, remove from queue
      setPendingMessages(prev => prev.filter(msg => msg.id !== pendingMessage.id));
      
    } catch (error) {
      console.error('[Chat] Failed to process pending message:', error);
      
      // Mark as failed if we've retried too many times
      if (pendingMessage.retryCount >= 3) {
        setPendingMessages(prev => 
          prev.map(msg => 
            msg.id === pendingMessage.id 
              ? { ...msg, status: 'failed' } 
              : msg
          )
        );
        
        toast({
          title: "Message Failed",
          description: "Unable to send message after multiple attempts",
          variant: "destructive",
        });
      } else {
        // Increment retry count and move to back of queue
        setPendingMessages(prev => [
          ...prev.filter(msg => msg.id !== pendingMessage.id),
          { 
            ...pendingMessage, 
            retryCount: pendingMessage.retryCount + 1,
            status: 'pending'
          }
        ]);
      }
    }
  };
  
  // Try to process queue whenever connectivity changes or component renders
  useEffect(() => {
    if (!hasConnectivityIssue && pendingMessages.length > 0) {
      processMessageQueue();
    }
  }, [hasConnectivityIssue, pendingMessages.length]);

  const sendMessage = async (
    content: string,
    parentMessageId?: string | null,
    files: File[] = []
  ): Promise<string> => {
    if (!channelId || !currentUserId) throw new Error("Missing required data");
    if (!content.trim() && files.length === 0) throw new Error("Message cannot be empty");
    
    // If we have connectivity issues, queue the message for later
    if (hasConnectivityIssue) {
      const tempId = `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      setPendingMessages(prev => [
        ...prev,
        {
          id: tempId,
          content,
          parentMessageId,
          files,
          createdAt: new Date(),
          retryCount: 0,
          status: 'pending'
        }
      ]);
      
      toast({
        title: "Offline Mode",
        description: "Message queued for sending when connection is restored",
      });
      
      return tempId;
    }
    
    try {
      // Upload attachments in parallel for better performance
      console.log('[Chat] Starting file uploads:', files.length);
      const uploadPromises = files.map(file => uploadAttachment(file));
      const uploadedAttachments = await Promise.all(uploadPromises);
      console.log('[Chat] All files uploaded successfully');

      const attachmentsForDb = uploadedAttachments.map(att => ({
        ...att
      })) as unknown as Json[];

      const newMessage = {
        channel_id: channelId,
        sender_id: currentUserId,
        content: content.trim(),
        parent_message_id: parentMessageId,
        attachments: attachmentsForDb,
        reactions: {} as Json
      };

      const { data, error } = await supabase
        .from('chat_messages')
        .insert(newMessage)
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error("No data returned from insert");

      await fetchMessages();
      return data.id;
    } catch (error) {
      console.error('[Chat] Error sending message:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      // First verify the message exists and belongs to the current user
      const { data: message, error: fetchError } = await supabase
        .from('chat_messages')
        .select('sender_id')
        .eq('id', messageId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // Message not found - it may have been deleted already or never existed
          console.warn('[Chat] Attempted to delete non-existent message:', messageId);
          toast({
            title: "Message Not Found",
            description: "The message may have been deleted already",
          });
          return;
        }
        throw fetchError;
      }

      if (!message) {
        throw new Error('Message not found');
      }

      if (message.sender_id !== currentUserId) {
        throw new Error('You can only delete your own messages');
      }

      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      // Refresh messages list after deletion
      await fetchMessages();
      
      toast({
        title: "Success",
        description: "Message deleted successfully"
      });
    } catch (error) {
      console.error('[Chat] Error deleting message:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  const markMentionsAsRead = async () => {
    if (!currentUserId || !channelId) return;

    try {
      const { error } = await supabase
        .from('message_mentions')
        .update({ status: 'read' })
        .eq('mentioned_user_id', currentUserId)
        .eq('channel_id', channelId)
        .eq('status', 'unread');

      if (error) {
        console.error('[Chat] Error marking mentions as read:', error);
      }
    } catch (error) {
      console.error('[Chat] Error marking mentions as read:', error);
    }
  };

  const reactToMessage = async (messageId: string, emoji: string) => {
    if (!currentUserId) return;

    try {
      // First get the current reactions to handle race conditions
      const { data: messages, error: fetchError } = await supabase
        .from('chat_messages')
        .select('reactions')
        .eq('id', messageId)
        .single();

      if (fetchError) {
        console.error('[Chat] Error fetching message reactions:', fetchError);
        throw fetchError;
      }

      if (!messages) {
        throw new Error('Message not found');
      }

      const currentReactions = messages.reactions as Record<string, string[]> || {};
      const currentUsers = currentReactions[emoji] || [];
      
      let updatedUsers;
      if (currentUsers.includes(currentUserId)) {
        updatedUsers = currentUsers.filter(id => id !== currentUserId);
      } else {
        updatedUsers = [...currentUsers, currentUserId];
      }

      const updatedReactions = {
        ...currentReactions,
        [emoji]: updatedUsers
      };

      if (updatedUsers.length === 0) {
        delete updatedReactions[emoji];
      }

      const { error } = await supabase
        .from('chat_messages')
        .update({ reactions: updatedReactions })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('[Chat] Error updating reaction:', error);
      toast({
        title: "Error",
        description: "Failed to update reaction",
        variant: "destructive",
      });
    }
  };

  return {
    sendMessage,
    deleteMessage,
    reactToMessage,
    markMentionsAsRead,
    pendingMessages,
    uploadProgress,
    clearFailedMessages: () => setPendingMessages(prev => prev.filter(msg => msg.status !== 'failed'))
  };
};
