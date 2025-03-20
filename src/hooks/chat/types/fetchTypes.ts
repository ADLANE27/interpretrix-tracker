
import { MessageData } from '@/types/messaging';

export interface FetchOptions {
  limit?: number;
  forceRefresh?: boolean;
}

export interface FetchControls {
  activeFetch: React.MutableRefObject<boolean>;
  fetchLock: React.MutableRefObject<boolean>;
  fetchDebounceTimer: React.MutableRefObject<NodeJS.Timeout | null>;
  initialFetchDone: React.MutableRefObject<boolean>;
  refreshInProgress: React.MutableRefObject<boolean>;
  forceInitialLoad: React.MutableRefObject<boolean>;
  lastFetchStartTime: React.MutableRefObject<number>;
  minimumFetchDelay: React.MutableRefObject<number>;
  initialLoadingTimer: React.MutableRefObject<NodeJS.Timeout | null>;
}

export interface FetchState {
  lastFetchTime: React.MutableRefObject<Date | null>;
  stableMessageCount: React.MutableRefObject<number>;
}

export interface FetchResult {
  fetchMessages: (limit?: number) => Promise<void>;
  loadMoreMessages: (currentCount: number, isCurrentlyLoading: boolean, hasMore: boolean) => Promise<void>;
  forceRefresh: () => Promise<void>;
  lastFetchTime: Date | null;
  initialFetchDone: boolean;
}
