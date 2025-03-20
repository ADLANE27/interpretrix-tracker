
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface TerminologySearchResult {
  id?: string;
  term: string;
  result: string;
  sourceLanguage: string;
  targetLanguage: string;
  createdAt?: string;
  userId?: string;
  isFavorite?: boolean;
}

export interface SearchHistoryItem extends TerminologySearchResult {
  id: string;
  createdAt: string;
  userId: string;
}

export const useTerminologySearch = (userId: string | undefined) => {
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch search history
  const { data: searchHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['terminology-search-history', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('terminology_searches')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching search history:', error);
        return [];
      }

      return data as SearchHistoryItem[];
    },
    enabled: !!userId
  });

  // Fetch favorite terms
  const { data: favorites = [], isLoading: isLoadingFavorites } = useQuery({
    queryKey: ['terminology-favorites', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('saved_terms')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching favorites:', error);
        return [];
      }

      return data as SearchHistoryItem[];
    },
    enabled: !!userId
  });

  // Search terminology mutation
  const { mutateAsync: searchTerminology } = useMutation({
    mutationFn: async ({ 
      term, 
      sourceLanguage, 
      targetLanguage, 
      context 
    }: { 
      term: string; 
      sourceLanguage: string; 
      targetLanguage: string; 
      context?: string;
    }) => {
      setIsSearching(true);
      try {
        // Call the edge function
        const { data, error } = await supabase.functions.invoke('terminology-search', {
          body: { term, sourceLanguage, targetLanguage, context }
        });

        if (error) throw error;

        // Save search to history if user is logged in
        if (userId) {
          const { error: saveError } = await supabase
            .from('terminology_searches')
            .insert({
              user_id: userId,
              term,
              result: data.result,
              source_language: sourceLanguage,
              target_language: targetLanguage
            });

          if (saveError) {
            console.error('Error saving search to history:', saveError);
          }
        }

        return data as TerminologySearchResult;
      } finally {
        setIsSearching(false);
      }
    },
    onSuccess: () => {
      // Refetch search history after a new search
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['terminology-search-history', userId] });
      }
    },
    onError: (error) => {
      console.error('Search error:', error);
      toast({
        title: "Erreur de recherche",
        description: "Impossible d'effectuer la recherche terminologique",
        variant: "destructive"
      });
    }
  });

  // Toggle favorite status
  const { mutate: toggleFavorite } = useMutation({
    mutationFn: async ({ 
      item, 
      isFavorite 
    }: { 
      item: TerminologySearchResult; 
      isFavorite: boolean 
    }) => {
      if (!userId) throw new Error("User not authenticated");
      
      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('saved_terms')
          .delete()
          .eq('term', item.term)
          .eq('user_id', userId);
          
        if (error) throw error;
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('saved_terms')
          .insert({
            user_id: userId,
            term: item.term,
            result: item.result,
            source_language: item.sourceLanguage,
            target_language: item.targetLanguage
          });
          
        if (error) throw error;
      }
    },
    onSuccess: () => {
      // Refetch favorites after toggle
      queryClient.invalidateQueries({ queryKey: ['terminology-favorites', userId] });
    },
    onError: (error) => {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier les favoris",
        variant: "destructive"
      });
    }
  });

  return {
    searchTerminology,
    searchHistory,
    favorites,
    toggleFavorite,
    isSearching,
    isLoadingHistory,
    isLoadingFavorites
  };
};
