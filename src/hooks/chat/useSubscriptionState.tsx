
import { useState } from 'react';

export const useSubscriptionState = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  return {
    isSubscribed,
    setIsSubscribed,
    retryCount,
    setRetryCount,
    currentUserId,
    setCurrentUserId
  };
};
