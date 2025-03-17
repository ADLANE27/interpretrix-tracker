
import { supabase } from '@/integrations/supabase/client';
import { Attachment } from '@/types/messaging';
import { sanitizeFilename, validateFile } from '@/utils/fileUploadUtils';

export const useAttachmentUpload = () => {
  /**
   * Upload a file attachment to Supabase storage
   */
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
        const { data, error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(sanitizedFilename, file, {
            cacheControl: '3600',
            upsert: false
          });

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

  return { uploadAttachment };
};
