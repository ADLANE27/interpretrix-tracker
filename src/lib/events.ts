
import mitt from 'mitt';
import { Profile } from '@/types/profile';

// Définition des types d'événements
export const EVENT_INTERPRETER_STATUS_UPDATE = 'interpreter-status-update';
export const EVENT_UNREAD_MENTIONS_UPDATED = 'unread-mentions-updated';
export const EVENT_NEW_MESSAGE_RECEIVED = 'new-message-received';
export const EVENT_CONNECTION_STATUS_CHANGE = 'connection-status-change';
export const EVENT_INTERPRETER_BADGE_UPDATE = 'interpreter-badge-update';

// Création d'un émetteur d'événements typé
type Events = {
  [EVENT_INTERPRETER_STATUS_UPDATE]: { interpreterId: string, status: Profile['status'] };
  [EVENT_UNREAD_MENTIONS_UPDATED]: number;
  [EVENT_NEW_MESSAGE_RECEIVED]: any;
  [EVENT_CONNECTION_STATUS_CHANGE]: boolean;
  [EVENT_INTERPRETER_BADGE_UPDATE]: { interpreterId: string, status: Profile['status'] };
};

// Une seule instance d'émetteur d'événements pour toute l'application
export const eventEmitter = mitt<Events>();
