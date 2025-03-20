
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SavedTerm, TermSearch, TermSearchRequest, TermSearchResponse } from "@/types/terminology";
import { useToast } from "@/hooks/use-toast";

export const useTerminologySearch = (userId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSearching, setIsSearching] = useState(false);

  // Query to retrieve search history
  const { data: searchHistory, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['terminology-history', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('terminology_searches')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching search history:", error);
        throw new Error(error.message);
      }

      return data as TermSearch[];
    },
    enabled: !!userId,
  });

  // Query to retrieve saved terms
  const { data: savedTerms, isLoading: isSavedTermsLoading } = useQuery({
    queryKey: ['saved-terms', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('saved_terms')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching saved terms:", error);
        throw new Error(error.message);
      }

      return data as SavedTerm[];
    },
    enabled: !!userId,
  });

  // Mutation to perform terminology search
  const searchMutation = useMutation({
    mutationFn: async (searchParams: TermSearchRequest): Promise<TermSearchResponse> => {
      setIsSearching(true);
      console.log("Starting terminology search:", searchParams);
      
      try {
        // Make the edge function call with a timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await supabase.functions.invoke('terminology-search', {
          body: searchParams,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        console.log("Terminology search response:", response);

        if (response.error) {
          console.error("Terminology search error:", response.error);
          throw new Error(response.error.message || "Échec de la recherche terminologique");
        }

        if (!response.data) {
          console.error("Terminology search returned no data");
          throw new Error("Aucun résultat reçu du service de traduction");
        }

        if (response.data.error) {
          console.error("Terminology search returned error in data:", response.data.error);
          throw new Error(response.data.error);
        }

        return response.data as TermSearchResponse;
      } catch (error) {
        console.error("Terminology search exception:", error);
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new Error("La recherche a pris trop de temps. Veuillez réessayer.");
        }
        throw error;
      } finally {
        setIsSearching(false);
      }
    },
    onSuccess: (data) => {
      console.log("Search successful:", data);
      queryClient.invalidateQueries({ queryKey: ['terminology-history', userId] });
      
      // Show success toast
      toast({
        title: "Recherche réussie",
        description: "La traduction a été trouvée",
        variant: "default"
      });
    },
    onError: (error: Error) => {
      console.error("Search error in onError handler:", error);
      toast({
        title: "Erreur de recherche",
        description: error.message || "Une erreur s'est produite lors de la recherche",
        variant: "destructive"
      });
    }
  });

  // Mutation to save a term
  const saveMutation = useMutation({
    mutationFn: async (term: TermSearch) => {
      const { error } = await supabase.from('saved_terms').insert({
        user_id: term.user_id,
        term: term.term,
        result: term.result,
        source_language: term.source_language,
        target_language: term.target_language
      });

      if (error) {
        if (error.code === '23505') { // Code for unique constraint violation
          throw new Error("Ce terme est déjà dans vos favoris");
        }
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-terms', userId] });
      toast({
        title: "Terme sauvegardé",
        description: "Le terme a été ajouté à vos favoris",
        variant: "default"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutation to delete a saved term
  const deleteSavedTermMutation = useMutation({
    mutationFn: async (termId: string) => {
      const { error } = await supabase
        .from('saved_terms')
        .delete()
        .eq('id', termId);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-terms', userId] });
      toast({
        title: "Terme supprimé",
        description: "Le terme a été retiré de vos favoris",
        variant: "default"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return {
    searchTerm: (params: Omit<TermSearchRequest, 'userId'>) => {
      if (!userId) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour effectuer une recherche",
          variant: "destructive"
        });
        return Promise.reject(new Error("User not authenticated"));
      }
      return searchMutation.mutateAsync({ ...params, userId });
    },
    saveTerm: (term: TermSearch) => saveMutation.mutateAsync(term),
    deleteSavedTerm: (termId: string) => deleteSavedTermMutation.mutateAsync(termId),
    searchHistory,
    savedTerms,
    isSearching,
    isHistoryLoading,
    isSavedTermsLoading,
  };
};
