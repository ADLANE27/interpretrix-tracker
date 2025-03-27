
import { LANGUAGES } from '@/lib/constants';
import { MENTION_PATTERN } from '@/services/realtime/constants';

export const useMessageFormatter = () => {
  const formatMessage = (content: string) => {
    // Don't modify the content when it contains language mentions
    // We want to preserve the full format of @Language mentions for the database
    return content;
  };

  // Helper function to validate mentions in a message
  const validateMentions = (content: string): { isValid: boolean; error?: string } => {
    if (!content) return { isValid: true };
    
    const mentions = content.match(MENTION_PATTERN);
    
    if (!mentions) return { isValid: true };
    
    // Check if any mention is too long (which could indicate a malformed mention)
    for (const mention of mentions) {
      if (mention.length > 50) {
        return { 
          isValid: false, 
          error: "Une mention semble être trop longue. Vérifiez le format des mentions." 
        };
      }
    }
    
    return { isValid: true };
  };

  // Helper function to normalize strings for better comparison (kept for reference)
  const normalizeString = (str: string): string => {
    return str.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics (accents)
      .replace(/[^a-z0-9\s\-]/g, "") // Remove special characters but keep hyphens
      .replace(/\s+/g, " ")  // Normalize spaces
      .trim();
  };

  return {
    formatMessage,
    validateMentions
  };
};
