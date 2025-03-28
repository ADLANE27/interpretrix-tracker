
import { LANGUAGES } from '@/lib/constants';

// Pattern for detecting mentions in messages
export const MENTION_PATTERN = /@([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)*)/g;

export const useMessageFormatter = () => {
  const formatMessage = (content: string) => {
    // Process the content for mentions but preserve the original format
    // This helps ensure consistent format for both display and database storage
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

  // Helper function to normalize strings for better comparison
  const normalizeString = (str: string): string => {
    return str.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics (accents)
      .replace(/[^a-z0-9\s\-]/g, "") // Remove special characters but keep hyphens
      .replace(/\s+/g, " ")  // Normalize spaces
      .trim();
  };

  /**
   * Check if a string is a language available in the system
   * This helps with language mentions validation (@Language)
   */
  const isValidLanguage = (mentionText: string): boolean => {
    const normalizedMention = normalizeString(mentionText);
    
    return LANGUAGES.some(language => {
      const normalizedLanguage = normalizeString(language);
      return normalizedLanguage === normalizedMention || 
             normalizedLanguage.startsWith(normalizedMention) ||
             normalizedMention.startsWith(normalizedLanguage);
    });
  };

  return {
    formatMessage,
    validateMentions,
    normalizeString,
    isValidLanguage
  };
};
