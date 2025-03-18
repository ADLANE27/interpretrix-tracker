// Constants for the application

// Theme constants
export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
};

// API endpoints
export const API_ENDPOINTS = {
  AUTH: '/api/auth',
  USERS: '/api/users',
  INTERPRETERS: '/api/interpreters',
  MISSIONS: '/api/missions',
  CHANNELS: '/api/channels',
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
};

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'dd/MM/yyyy',
  API: 'yyyy-MM-dd',
  TIME: 'HH:mm',
  DATETIME: 'dd/MM/yyyy HH:mm',
};

// Status codes
export const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
};

// Roles
export const ROLES = {
  ADMIN: 'admin',
  INTERPRETER: 'interpreter',
  CLIENT: 'client',
};

// Standardized language list for mentions
export const LANGUAGES = [
  "Français",
  "Anglais",
  "Espagnol",
  "Allemand", 
  "Italien",
  "Portugais",
  "Russe",
  "Chinois",
  "Arabe",
  "Japonais",
  "Coréen",
  "Néerlandais",
  "Polonais",
  "Suédois",
  "Turc",
  "Grec",
  "Hébreu",
  "Hindi",
  "Vietnamien",
  "Thaï",
  "Roumain",
  "Tchèque",
  "Hongrois",
  "Ukrainien",
  "Danois",
  "Finnois",
  "Norvégien",
  "Bengali",
  "Farsi",
  "Bulgare",
  "Serbo-Croate",
  "Slovaque"
];

// Mission status
export const MISSION_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// Notification types
export const NOTIFICATION_TYPES = {
  MISSION_ASSIGNED: 'mission_assigned',
  MISSION_UPDATED: 'mission_updated',
  MISSION_CANCELLED: 'mission_cancelled',
  NEW_MESSAGE: 'new_message',
  MENTION: 'mention',
};

// Local storage keys
export const STORAGE_KEYS = {
  THEME: 'theme',
  AUTH_TOKEN: 'auth_token',
  USER_PREFERENCES: 'user_preferences',
};

// Animation durations
export const ANIMATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
};
