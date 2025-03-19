
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAllLanguages() {
  const { data: languages = [], isLoading, error } = useQuery({
    queryKey: ['all-languages'],
    queryFn: async () => {
      console.log('Fetching all unique languages');
      
      // Get all unique source languages
      const { data: sourceLanguages, error: sourceError } = await supabase.rpc('get_all_source_languages');
      
      // Get all unique target languages
      const { data: targetLanguages, error: targetError } = await supabase.rpc('get_all_target_languages');
      
      if (sourceError) {
        console.error('Error fetching source languages:', sourceError);
      }
      
      if (targetError) {
        console.error('Error fetching target languages:', targetError);
      }
      
      // Combine and deduplicate languages
      const allLanguages = new Set<string>();
      
      if (sourceLanguages && Array.isArray(sourceLanguages)) {
        sourceLanguages.forEach((lang: { source_language: string }) => {
          if (lang.source_language && lang.source_language.trim() !== '') {
            allLanguages.add(lang.source_language);
          }
        });
      }
      
      if (targetLanguages && Array.isArray(targetLanguages)) {
        targetLanguages.forEach((lang: { target_language: string }) => {
          if (lang.target_language && lang.target_language.trim() !== '') {
            allLanguages.add(lang.target_language);
          }
        });
      }
      
      // Convert Set to sorted array
      return Array.from(allLanguages).sort();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return { languages, isLoading, error };
}
