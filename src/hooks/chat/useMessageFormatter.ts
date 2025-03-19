
import { LANGUAGES } from '@/lib/constants';

export const useMessageFormatter = () => {
  const formatMessage = (content: string) => {
    // Only replace language mentions with standardized versions if they closely match our constants
    let formattedContent = content;
    
    // Create a RegExp pattern that matches any language mention
    const languageMentionPattern = /@([A-Za-zÀ-ÿ\s]+(?:\([^)]*\))?)/g;
    
    formattedContent = formattedContent.replace(languageMentionPattern, (match, mentionedLanguage) => {
      const cleanedMention = mentionedLanguage.trim();
      
      // Only standardize if we have a very close match (at least 80% similar)
      const matchedLanguage = LANGUAGES.find(lang => {
        const normalizedLang = lang.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const normalizedMention = cleanedMention.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        return normalizedLang === normalizedMention || 
               normalizedLang.startsWith(normalizedMention) ||
               normalizedMention.startsWith(normalizedLang);
      });
      
      if (matchedLanguage) {
        return `@${matchedLanguage}`;
      }
      
      // If no close match found, preserve the original mention
      return match;
    });
    
    return formattedContent;
  };

  return {
    formatMessage
  };
};
