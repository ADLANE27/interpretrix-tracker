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

// Language mapping (code to name)
export const LANGUAGE_MAP = {
  fr: "Français",
  en: "English",
  es: "Español",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
  nl: "Nederlands",
  ru: "Русский",
  ar: "العربية",
  zh: "中文",
  ja: "日本語",
  ko: "한국어"
};

// Complete list of languages that exactly match what's shown on interpreter cards
export const LANGUAGES = [
  // Main languages as they appear on interpreter cards
  "Afar", "Abkhaze", "Avestique", "Afrikaans", "Akan", "Amharique", "Aragonais",
  
  // Arabic variants as they appear on interpreter cards
  "Arabe", "Arabe Maghrébin", "Arabe Soudanais", "Arabe Moyen-Orient",
  
  // English variants as they appear on interpreter cards
  "Anglais", "Anglais Standard", "Anglais Africain", "Pidgin",
  
  // French variants as they appear on interpreter cards
  "Français", "Français Canadien", "Français Africain", "Français Belge", "Français Suisse",
  
  // Spanish variants as they appear on interpreter cards
  "Espagnol", "Espagnol Castillan", "Espagnol Latino-américain",
  
  // Chinese variants as they appear on interpreter cards
  "Chinois", "Chinois Mandarin", "Chinois Cantonais",
  
  // Other languages with variants as they appear on interpreter cards
  "Portugais", "Portugais Brésilien",
  "Russe", "Russe Standard",
  "Bengali", "Bengali Indien",

  // Standard languages continued
  "Araméen", "Assamais", "Asturien", "Avarique", "Aymara", "Azéri", "Bachkir", "Biélorusse",
  "Bulgare", "Bihari", "Bichelamar", "Bambara", "Tibétain", "Breton", "Bosnien", "Catalan",
  "Tchétchène", "Chamorro", "Corse", "Cri", "Tchèque", "Vieux-slave", "Tchouvache", "Gallois",
  "Danois", "Allemand", "Maldivien", "Dzongkha", "Ewe", "Grec", "Espéranto", "Estonien", 
  "Basque", "Persan", "Peul", "Finnois", "Fidjien", "Féroïen", "Frison", "Irlandais",
  "Gaélique", "Galicien", "Guarani", "Gujarati", "Mannois", "Haoussa", "Hébreu", "Hindi",
  "Hiri Motu", "Croate", "Haïtien", "Hongrois", "Arménien", "Hérèro", "Interlingua", "Indonésien",
  "Occidental", "Igbo", "Yi", "Inupiaq", "Ido", "Islandais", "Italien", "Inuktitut", "Japonais",
  "Javanais", "Géorgien", "Kongo", "Kikuyu", "Kuanyama", "Kazakh", "Groenlandais", "Khmer",
  "Kannada", "Coréen", "Kanouri", "Cachemiri", "Kurde", "Kom", "Cornique", "Kirghize", "Latin",
  "Luxembourgeois", "Ganda", "Limbourgeois", "Lingala", "Lao", "Lituanien", "Louba", "Letton",
  "Malgache", "Marshallais", "Maori", "Macédonien", "Malayalam", "Mongol", "Moldave", "Marathe",
  "Malais", "Maltais", "Birman", "Nauru", "Norvégien bokmål", "Ndébélé", "Népalais", "Ndonga",
  "Néerlandais", "Norvégien nynorsk", "Norvégien", "Sotho du Sud", "Occitan", "Ojibwé", "Oromo",
  "Oriya", "Ossète", "Pendjabi", "Pali", "Polonais", "Pachto", "Quechua", "Romanche", "Kirundi",
  "Roumain", "Kinyarwanda", "Sanskrit", "Sarde", "Sindhi", "Sami", "Sango", "Singhalais", "Slovaque",
  "Slovène", "Samoan", "Shona", "Somali", "Albanais", "Serbe", "Swati", "Sotho", "Soundanais", "Suédois",
  "Swahili", "Swahili Tanzanie", "Swahili Kenya", "Tamoul", "Télougou", "Tadjik", "Thaï", "Tigrinya",
  "Turkmène", "Tagalog", "Tswana", "Tongien", "Turc", "Tsonga", "Tatar", "Twi", "Tahitien", "Ouïghour",
  "Ukrainien", "Ourdou", "Ouzbek", "Venda", "Vietnamien", "Volapük", "Wallon", "Wolof", "Xhosa", "Yiddish",
  "Yorouba", "Zhuang", "Zoulou",
  
  // Sign languages
  "Langue des signes internationale", "Langue des signes française", "Langue des signes américaine",
  
  // Creole languages
  "Créole haïtien", "Créole mauricien", "Créole réunionnais", "Créole seychellois", "Créole guadeloupéen",
  "Créole martiniquais", "Créole guyanais",
  
  // Other language variants
  "Hindi Ourdou", "Finnois Suédois", "Kabyle", "Wolof", "Patois", "Dialecte Jamaïcain", 
  "Patois Jamaïcain", "Créole Jamaïcain"
];

export const TRANSLATIONS = {
  download: {
    fr: "Télécharger",
    en: "Download",
    es: "Descargar",
    de: "Herunterladen",
    it: "Scarica",
    pt: "Baixar",
    nl: "Downloaden",
    ru: "Скачать",
    ar: "تحميل",
    zh: "下载",
    ja: "ダウンロード",
    ko: "다운ロード"
  },
  preview: {
    fr: "Aperçu",
    en: "Preview",
    es: "Vista previa",
    de: "Vorschau",
    it: "Anteprima",
    pt: "Visualizar",
    nl: "Voorbeeld",
    ru: "Просмотр",
    ar: "معاينة",
    zh: "预览",
    ja: "プレビュー",
    ko: "미리보기"
  }
};

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
