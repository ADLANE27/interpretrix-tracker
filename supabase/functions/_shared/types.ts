
export interface LanguagePair {
  source: string;
  target: string;
}

export const isValidLanguagePair = (lang: any): lang is LanguagePair => {
  return Boolean(
    lang &&
    typeof lang === 'object' &&
    typeof lang.source === 'string' &&
    typeof lang.target === 'string' &&
    lang.source.trim() !== '' &&
    lang.target.trim() !== ''
  );
};
