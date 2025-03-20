
import { useRef, useCallback } from 'react';
import { FetchControls, FetchState } from './types/fetchTypes';

export function useFetchState() {
  // Fetch control refs
  const activeFetch = useRef<boolean>(false);
  const fetchLock = useRef<boolean>(false);
  const fetchDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const initialFetchDone = useRef<boolean>(false);
  const refreshInProgress = useRef<boolean>(false);
  const forceInitialLoad = useRef<boolean>(true);
  const lastFetchStartTime = useRef<number>(0);
  const minimumFetchDelay = useRef<number>(300);
  const initialLoadingTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Fetch state refs
  const lastFetchTime = useRef<Date | null>(null);
  const stableMessageCount = useRef<number>(0);

  // Create a debounced loading state setter
  const debouncedSetLoading = useCallback((
    loading: boolean, 
    setIsLoading: (isLoading: boolean) => void
  ) => {
    if (loading) {
      if (fetchDebounceTimer.current) {
        clearTimeout(fetchDebounceTimer.current);
      }
      
      fetchDebounceTimer.current = setTimeout(() => {
        if (activeFetch.current) {
          setIsLoading(true);
        }
      }, 100);
    } else {
      if (fetchDebounceTimer.current) {
        clearTimeout(fetchDebounceTimer.current);
        fetchDebounceTimer.current = null;
      }
      setIsLoading(false);
    }
  }, []);

  // Reset fetch state
  const resetFetchState = useCallback(() => {
    fetchLock.current = false;
    refreshInProgress.current = true;
    initialFetchDone.current = false;
    forceInitialLoad.current = true;
  }, []);

  const controls: FetchControls = {
    activeFetch,
    fetchLock,
    fetchDebounceTimer,
    initialFetchDone,
    refreshInProgress,
    forceInitialLoad,
    lastFetchStartTime,
    minimumFetchDelay,
    initialLoadingTimer
  };

  const state: FetchState = {
    lastFetchTime,
    stableMessageCount
  };

  return {
    controls,
    state,
    debouncedSetLoading,
    resetFetchState
  };
}
