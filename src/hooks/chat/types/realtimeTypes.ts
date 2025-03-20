
export interface RealtimeEventPayload {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, any>;
  old?: Record<string, any>;
  errors: string | null;
  receivedAt?: number;
}

export interface QueueState {
  isProcessingEvent: React.MutableRefObject<boolean>;
  processQueue: React.MutableRefObject<Array<any>>;
  processingTimeout: React.MutableRefObject<NodeJS.Timeout | null>;
}

export interface QueueActions {
  addToQueue: (payload: any) => void;
  clearQueue: () => void;
  isQueueEmpty: () => boolean;
  getNextFromQueue: () => any | null;
}

export interface ForceFetchState {
  forceFetchInProgress: React.MutableRefObject<boolean>;
}

export interface ForceFetchActions {
  forceFetch: () => Promise<void> | undefined;
}

export interface CooldownState {
  cooldownPeriod: React.MutableRefObject<boolean>;
}

export interface CooldownActions {
  startCooldown: (callback: () => void, duration?: number) => void;
}
