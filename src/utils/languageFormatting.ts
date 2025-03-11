
/**
 * Normalizes different arrow characters and spacing in language pairs
 */
export const normalizeLanguagePair = (languagePair: string): string => {
  // Replace different types of arrows and normalize spacing
  return languagePair
    .replace(/[→⟶⇒⇨→]|-->|->/g, '→')  // normalize different arrow types to →
    .replace(/\s*→\s*/g, ' → ');  // ensure consistent spacing around arrow
};

/**
 * Formats a language pair consistently
 */
export const formatLanguagePair = (source: string, target: string): string => {
  return `${source} → ${target}`;
};

/**
 * Compares two language pairs, ignoring differences in arrow types and spacing
 */
export const compareLanguagePairs = (pair1: string, pair2: string): boolean => {
  return normalizeLanguagePair(pair1) === normalizeLanguagePair(pair2);
};
