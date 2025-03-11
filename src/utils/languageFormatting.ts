
/**
 * Standardizes language pair format to match database format
 * Format: "source → target" with proper spacing
 */
export const normalizeLanguagePair = (languagePair: string): string => {
  if (!languagePair) return '';
  
  // Replace different types of arrows and normalize spacing
  return languagePair
    .replace(/[⟶⇒⇨]|-->|->/g, '→')  // normalize different arrow types to →
    .replace(/\s*→\s*/g, ' → ')      // ensure consistent spacing around arrow
    .trim();                         // remove any leading/trailing whitespace
};

/**
 * Formats a language pair with the standardized format
 */
export const formatLanguagePair = (source: string, target: string): string => {
  if (!source || !target) return '';
  return `${source.trim()} → ${target.trim()}`;
};

/**
 * Compares two language pairs, using the standardized format
 */
export const compareLanguagePairs = (pair1: string, pair2: string): boolean => {
  return normalizeLanguagePair(pair1) === normalizeLanguagePair(pair2);
};

/**
 * Splits a language pair into source and target languages
 */
export const splitLanguagePair = (pair: string): { source: string; target: string } => {
  const normalized = normalizeLanguagePair(pair);
  const [source = '', target = ''] = normalized.split('→').map(s => s.trim());
  return { source, target };
};

/**
 * Validates a language pair format
 */
export const isValidLanguagePair = (pair: string): boolean => {
  const normalized = normalizeLanguagePair(pair);
  return /^[^→]+\s→\s[^→]+$/.test(normalized);
};
