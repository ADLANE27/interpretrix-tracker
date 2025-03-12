
export interface LanguagePair {
  source: string;
  target: string;
}

export const isValidLanguagePair = (lang: any): lang is LanguagePair => {
  if (!lang || typeof lang !== 'object') {
    console.warn('Invalid language pair structure:', lang);
    return false;
  }
  
  if (typeof lang.source !== 'string' || typeof lang.target !== 'string') {
    console.warn('Language pair missing source or target:', lang);
    return false;
  }
  
  if (lang.source.trim() === '' || lang.target.trim() === '') {
    console.warn('Language pair has empty source or target:', lang);
    return false;
  }
  
  return true;
};

