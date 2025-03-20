
import { LANGUAGES } from '@/lib/constants';

export const useMessageFormatter = () => {
  const formatMessage = (content: string) => {
    // Only replace language mentions with standardized versions if they closely match our constants
    let formattedContent = content;
    
    // Create a RegExp pattern that matches any language mention
    const languageMentionPattern = /@([A-Za-zÀ-ÿ\s]+(?:\([^)]*\))?)/g;
    
    formattedContent = formattedContent.replace(languageMentionPattern, (match, mentionedLanguage) => {
      const cleanedMention = mentionedLanguage.trim();
      
      // Only standardize if we have a very close match using a more flexible comparison
      const matchedLanguage = findBestLanguageMatch(cleanedMention);
      
      if (matchedLanguage) {
        return `@${matchedLanguage}`;
      }
      
      // If no close match found, preserve the original mention
      return match;
    });
    
    return formattedContent;
  };

  // Helper function to find the best matching language with improved matching
  const findBestLanguageMatch = (query: string): string | null => {
    if (!query || query.length < 2) return null;
    
    // Normalize the query for comparison
    const normalizedQuery = normalizeString(query);
    
    // First try for exact match
    const exactMatch = LANGUAGES.find(lang => {
      const normalizedLang = normalizeString(lang);
      return normalizedLang === normalizedQuery;
    });
    
    if (exactMatch) return exactMatch;
    
    // Then try for a starts-with match
    const startsWithMatch = LANGUAGES.find(lang => {
      const normalizedLang = normalizeString(lang);
      return normalizedLang.startsWith(normalizedQuery) || normalizedQuery.startsWith(normalizedLang);
    });
    
    if (startsWithMatch) return startsWithMatch;
    
    // Finally try for a contains match with minimum length to avoid false positives
    if (normalizedQuery.length >= 3) {
      const containsMatch = LANGUAGES.find(lang => {
        const normalizedLang = normalizeString(lang);
        return normalizedLang.includes(normalizedQuery);
      });
      
      if (containsMatch) return containsMatch;
    }
    
    return null;
  };
  
  // Helper function to normalize strings for better comparison
  const normalizeString = (str: string): string => {
    return str.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics (accents)
      .replace(/[^a-z0-9\s]/g, "")     // Remove special characters
      .trim();
  };

  return {
    formatMessage
  };
};
