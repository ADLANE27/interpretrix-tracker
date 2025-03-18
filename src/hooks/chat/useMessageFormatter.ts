
import { useChannelLanguages } from './useChannelLanguages';

export const useMessageFormatter = (channelId?: string | null) => {
  const { languages } = useChannelLanguages(channelId);
  
  const formatMessage = (content: string) => {
    // Replace language mentions with standardized versions
    let formattedContent = content;
    
    // Create a RegExp pattern that matches any language mention
    const languageMentionPattern = /@([A-Za-zÀ-ÿ\s\-]+(?:\([^)]*\))?)/g;
    
    formattedContent = formattedContent.replace(languageMentionPattern, (match, mentionedLanguage) => {
      const cleanedMention = mentionedLanguage.trim();
      
      // Function to normalize text for comparison
      const normalize = (text: string) => {
        return text.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();
      };
      
      // First try exact matches with channel languages
      const exactMatch = languages.find(lang => 
        normalize(lang.name) === normalize(cleanedMention)
      );
      
      if (exactMatch) {
        return `@${exactMatch.name}`;
      }
      
      // Then try partial matches with channel languages (starts with)
      const partialMatch = languages.find(lang => 
        normalize(lang.name).startsWith(normalize(cleanedMention)) ||
        normalize(cleanedMention).startsWith(normalize(lang.name))
      );
      
      if (partialMatch) {
        return `@${partialMatch.name}`;
      }
      
      // If no match found, preserve the original mention
      return match;
    });
    
    return formattedContent;
  };

  return {
    formatMessage
  };
};
