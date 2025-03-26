
import { LANGUAGES } from '@/lib/constants';

export const useMessageFormatter = () => {
  const formatMessage = (content: string) => {
    // Don't modify the content at all when it contains language mentions
    // Just return the original content as-is to preserve full language mentions
    return content;
  };

  // Helper function to normalize strings for better comparison (kept for reference)
  const normalizeString = (str: string): string => {
    return str.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics (accents)
      .replace(/[^a-z0-9\s\-]/g, "") // Remove special characters but keep hyphens
      .replace(/\s+/g, " ")  // Normalize spaces
      .trim();
  };

  return {
    formatMessage
  };
};
