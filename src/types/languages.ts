
export interface LanguagePair {
  source: string;
  target: string;
}

export const formatLanguageString = (pair: LanguagePair): string => {
  return `${pair.source} → ${pair.target}`;
};

export const parseLanguageString = (langString: string): LanguagePair => {
  if (!langString || typeof langString !== 'string') {
    console.warn('Invalid language string:', langString);
    return { source: '', target: '' };
  }

  if (!langString.includes('→')) {
    console.warn('Invalid language format:', langString);
    return { source: langString.trim(), target: '' };
  }

  const [source, target] = langString.split('→').map(l => l.trim());
  return { source: source || '', target: target || '' };
};

export const convertLanguagePairsToStrings = (pairs: LanguagePair[]): string[] => {
  return pairs.map(formatLanguageString);
};

export const convertStringsToLanguagePairs = (strings: string[]): LanguagePair[] => {
  return strings.map(parseLanguageString);
};

export const isValidLanguagePair = (pair: LanguagePair): boolean => {
  return Boolean(pair.source && pair.target);
};
