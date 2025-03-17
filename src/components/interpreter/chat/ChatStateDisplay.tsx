
import React from 'react';

interface ChatStateDisplayProps {
  isLoading: boolean;
  isSubscribed: boolean;
  subscriptionStatus: {
    messages: boolean;
  };
}

export const ChatStateDisplay: React.FC<ChatStateDisplayProps> = ({
  isLoading,
  isSubscribed,
  subscriptionStatus
}) => {
  if (!isLoading && isSubscribed) return null;
  
  return (
    <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex items-center justify-center">
      {isLoading ? (
        <p className="text-lg font-semibold">Chargement des messages...</p>
      ) : !isSubscribed ? (
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">
            Connexion en cours...
          </p>
          <p className="text-sm text-muted-foreground">
            {subscriptionStatus.messages ? 
              `Messages: ${subscriptionStatus.messages}` : 
              'Connexion aux messages...'}
          </p>
        </div>
      ) : null}
    </div>
  );
};
