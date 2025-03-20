
import { Message } from "@/types/messaging";
import { organizeMessageThreads } from './messageUtils';

export const useMessageOrganizer = (messages: Message[]) => {
  // Fonction simplifiée pour organiser les threads de messages
  // Utilise uniquement les messages fournis, sans logique conditionnelle complexe
  const organizeThreads = () => {
    return organizeMessageThreads(messages);
  };

  return { organizeThreads };
};
