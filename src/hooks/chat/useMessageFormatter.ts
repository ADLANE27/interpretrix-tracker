
import { useState, useEffect } from 'react';
import { LANGUAGES, LANGUAGE_MAP } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';

export const useMessageFormatter = () => {
  const [allLanguages, setAllLanguages] = useState<string[]>([]);
  
  // Fetch all unique languages from interpreter profiles
  useEffect(() => {
    const fetchAllLanguages = async () => {
      try {
        // First get the standard languages from constants
        const standardLanguages = [...LANGUAGES];
        
        // Then fetch unique languages from interpreter profiles
        const { data: languagesData, error } = await supabase.rpc('get_all_unique_languages');
        
        if (error) {
          console.error('Error fetching languages:', error);
          return;
        }
        
        // Combine standard languages with unique languages from database
        if (languagesData) {
          const uniqueLanguages = new Set([...standardLanguages, ...languagesData]);
          setAllLanguages(Array.from(uniqueLanguages));
        }
      } catch (error) {
        console.error('Failed to fetch languages:', error);
      }
    };
    
    fetchAllLanguages();
  }, []);
  
  const formatMessage = (content: string) => {
    // Replace language mentions with standardized versions
    let formattedContent = content;
    
    // Create a RegExp pattern that matches any language mention
    const languageMentionPattern = /@([A-Za-zÀ-ÿ\s]+(?:\([^)]*\))?)/g;
    
    formattedContent = formattedContent.replace(languageMentionPattern, (match, mentionedLanguage) => {
      const cleanedMention = mentionedLanguage.trim();
      
      // Use the combined language list including those from the database
      const availableLanguages = allLanguages.length > 0 ? allLanguages : LANGUAGES;
      
      // Check against both language codes and names
      const matchedByName = availableLanguages.find(lang => {
        const normalizedLang = lang.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const normalizedMention = cleanedMention.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        return normalizedLang === normalizedMention || 
               normalizedLang.startsWith(normalizedMention) ||
               normalizedMention.startsWith(normalizedLang) ||
               normalizedLang.includes(normalizedMention) ||
               normalizedMention.includes(normalizedLang);
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
    formatMessage,
    allLanguages
  };
};
