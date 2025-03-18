
import { LANGUAGES, LANGUAGE_MAP } from '@/lib/constants';

export const useMessageFormatter = () => {
  const formatMessage = (content: string) => {
    // Replace language mentions with standardized versions
    let formattedContent = content;
    
    // Create a RegExp pattern that matches any language mention
    const languageMentionPattern = /@([A-Za-zÀ-ÿ\s]+(?:\([^)]*\))?)/g;
    
    formattedContent = formattedContent.replace(languageMentionPattern, (match, mentionedLanguage) => {
      const cleanedMention = mentionedLanguage.trim();
      
      // Check against both language codes and names
      const matchedByName = LANGUAGES.find(lang => {
        const normalizedLang = lang.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const normalizedMention = cleanedMention.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        return normalizedLang === normalizedMention || 
               normalizedLang.startsWith(normalizedMention) ||
               normalizedMention.startsWith(normalizedLang);
      });
      
      // Also check if the mention matches a language code
      const matchedByCode = Object.entries(LANGUAGE_MAP).find(([code, name]) => {
        const normalizedCode = code.toLowerCase();
        const normalizedMention = cleanedMention.toLowerCase();
        
        return normalizedCode === normalizedMention || normalizedMention === normalizedCode;
      });
      
      if (matchedByName) {
        return `@${matchedByName}`;
      } else if (matchedByCode) {
        // Use the full language name if matched by code
        return `@${matchedByCode[1]}`;
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
