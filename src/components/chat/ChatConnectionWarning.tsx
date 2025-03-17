
import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ChatConnectionWarningProps {
  isSubscribed: boolean;
}

export const ChatConnectionWarning: React.FC<ChatConnectionWarningProps> = ({ 
  isSubscribed 
}) => {
  const isOnline = window.navigator.onLine;
  
  if (isSubscribed && isOnline) return null;
  
  return (
    <Alert variant="destructive" className="mb-3">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        {!isOnline 
          ? "Pas de connexion internet. Vos messages ne seront pas envoyés."
          : "Connexion perdue. Vos messages ne seront pas envoyés. Tentative de reconnexion..."}
      </AlertDescription>
    </Alert>
  );
};
