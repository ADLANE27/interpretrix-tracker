
import { LANGUAGES } from '@/lib/constants';

export const useMessageFormatter = () => {
  const formatMessage = (content: string) => {
    // Only replace language mentions with standardized versions if they closely match our constants
    let formattedContent = content;
    
    // Create a RegExp pattern that matches any language mention
    // Improved to better handle complex language names with spaces, diacritics, and parentheses
    const languageMentionPattern = /@([A-Za-zÀ-ÿ\s\-]+(?:\([^)]*\))?)/g;
    
    formattedContent = formattedContent.replace(languageMentionPattern, (match, mentionedLanguage) => {
      const cleanedMention = mentionedLanguage.trim();
      
      // Only standardize if we have a very close match using a more flexible comparison
      const matchedLanguage = findBestLanguageMatch(cleanedMention);
      
      if (matchedLanguage) {
        console.log(`[MessageFormatter] Standardized language mention: ${cleanedMention} → ${matchedLanguage}`);
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
    
    console.log(`[MessageFormatter] Finding best match for: "${query}"`);
    
    // Normalize the query for comparison
    const normalizedQuery = normalizeString(query);
    
    // First try for exact match
    const exactMatch = LANGUAGES.find(lang => {
      const normalizedLang = normalizeString(lang);
      return normalizedLang === normalizedQuery;
    });
    
    if (exactMatch) {
      console.log(`[MessageFormatter] Found exact match: ${exactMatch}`);
      return exactMatch;
    }
    
    // Then try for a starts-with match
    const startsWithMatch = LANGUAGES.find(lang => {
      const normalizedLang = normalizeString(lang);
      return normalizedLang.startsWith(normalizedQuery) || normalizedQuery.startsWith(normalizedLang);
    });
    
    if (startsWithMatch) {
      console.log(`[MessageFormatter] Found starts-with match: ${startsWithMatch}`);
      return startsWithMatch;
    }
    
    // Try for partial word matches, especially useful for compound language names
    const compoundMatch = LANGUAGES.find(lang => {
      const normalizedLang = normalizeString(lang);
      // Split by space and check if any part matches
      const langParts = normalizedLang.split(' ');
      const queryParts = normalizedQuery.split(' ');
      
      // Check if key words match between the query and language name
      const hasMatch = langParts.some(part => 
        queryParts.some(queryPart => 
          (queryPart.length > 3 && part.includes(queryPart)) || 
          (part.length > 3 && queryPart.includes(part))
        )
      );
      
      if (hasMatch) {
        console.log(`[MessageFormatter] Found compound match between "${normalizedQuery}" and "${normalizedLang}"`);
      }
      
      return hasMatch;
    });
    
    if (compoundMatch) {
      console.log(`[MessageFormatter] Selected compound match: ${compoundMatch}`);
      return compoundMatch;
    }
    
    // Special case for complex language names like "arabe maghrébin"
    const dialectMatch = LANGUAGES.find(lang => {
      const normalizedLang = normalizeString(lang);
      
      // Check for dialect variations by checking if the language contains the query
      // or if the query contains the language with high overlap
      if (normalizedLang.includes(normalizedQuery) && normalizedQuery.length >= 3) {
        console.log(`[MessageFormatter] Found dialect match (lang contains query): ${lang}`);
        return true;
      }
      
      if (normalizedQuery.includes(normalizedLang) && normalizedLang.length >= 3) {
        console.log(`[MessageFormatter] Found dialect match (query contains lang): ${lang}`);
        return true;
      }
      
      return false;
    });
    
    if (dialectMatch) {
      console.log(`[MessageFormatter] Selected dialect match: ${dialectMatch}`);
      return dialectMatch;
    }
    
    // Finally try for a contains match with minimum length to avoid false positives
    if (normalizedQuery.length >= 3) {
      const containsMatch = LANGUAGES.find(lang => {
        const normalizedLang = normalizeString(lang);
        return normalizedLang.includes(normalizedQuery);
      });
      
      if (containsMatch) {
        console.log(`[MessageFormatter] Found contains match: ${containsMatch}`);
        return containsMatch;
      }
    }
    
    console.log(`[MessageFormatter] No match found for: "${query}"`);
    return null;
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

  return {
    formatMessage
  };
};
