
import { LANGUAGES } from '@/lib/constants';

export const useMessageFormatter = () => {
  const formatMessage = (content: string) => {
    // Replace language mentions with standardized versions from our constants
    let formattedContent = content;
    
    // Create a RegExp pattern that matches any language mention
    const languageMentionPattern = /@([A-Za-zÀ-ÿ\s]+(?:\([^)]*\))?)/g;
    
    formattedContent = formattedContent.replace(languageMentionPattern, (match, mentionedLanguage) => {
      const cleanedMention = mentionedLanguage.trim();
      
      // Check if the mentioned language exists in our standardized list
      const matchedLanguage = LANGUAGES.find(lang => 
        lang.toLowerCase() === cleanedMention.toLowerCase() ||
        lang.toLowerCase().startsWith(cleanedMention.toLowerCase())
      );
      
      if (matchedLanguage) {
        return `@${matchedLanguage}`;
      }
      
      return match; // Keep original if no match found
    });
    
    return formattedContent;
  };

  return {
    formatMessage
  };
};
