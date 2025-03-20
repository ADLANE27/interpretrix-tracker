
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SavedTerm, TermSearch, TermSearchRequest, TermSearchResponse } from "@/types/terminology";
import { useToast } from "@/hooks/use-toast";

export const useTerminologySearch = (userId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSearching, setIsSearching] = useState(false);

  // Query pour récupérer l'historique des recherches
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

  // Query pour récupérer les termes sauvegardés
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

  // Mutation pour effectuer une recherche terminologique
  const searchMutation = useMutation({
    mutationFn: async (searchParams: TermSearchRequest): Promise<TermSearchResponse> => {
      setIsSearching(true);
      console.log("Starting terminology search:", searchParams);
      
      try {
        const response = await supabase.functions.invoke('terminology-search', {
          body: searchParams,
        });

        console.log("Terminology search response:", response);

        // Handle non-2xx status codes
        if (response.error) {
          console.error("Terminology search error:", response.error);
          throw new Error(response.error.message || "Échec de la recherche terminologique");
        }

        // Handle empty response data
        if (!response.data) {
          console.error("Terminology search returned no data");
          throw new Error("Aucun résultat reçu du service de traduction");
        }

        // Handle error in response data
        if (response.data.error) {
          console.error("Terminology search returned error in data:", response.data.error);
          throw new Error(response.data.error);
        }

        // Additional verification for empty result
        if (!response.data.result || response.data.result.trim() === "") {
          console.error("Empty result received from terminology search");
          throw new Error("Aucune traduction n'a été retournée. Veuillez réessayer.");
        }

        return response.data as TermSearchResponse;
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
      
      // Show error toast with more user-friendly message
      let errorMessage = error.message;
      
      // Map technical errors to user-friendly messages
      if (errorMessage.includes("non-2xx")) {
        errorMessage = "Le service de traduction n'est pas disponible. Veuillez réessayer plus tard.";
      } else if (errorMessage.includes("timeout")) {
        errorMessage = "La recherche a pris trop de temps. Veuillez réessayer plus tard.";
      } else if (errorMessage.includes("network") || errorMessage.includes("Failed to fetch")) {
        errorMessage = "Problème de connexion au service de traduction. Vérifiez votre connexion internet.";
      }
      
      toast({
        title: "Erreur de recherche",
        description: errorMessage || "Une erreur s'est produite lors de la recherche",
        variant: "destructive"
      });
    }
  });

  // Mutation pour sauvegarder un terme
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
        if (error.code === '23505') { // Code pour violation de contrainte unique
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

  // Mutation pour supprimer un terme sauvegardé
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
