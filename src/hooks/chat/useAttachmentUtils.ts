
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB limit
const ALLOWED_FILE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

/**
 * Sanitizes a filename for storage
 */
export const sanitizeFilename = (filename: string): string => {
  // Create a mapping of accented characters to their non-accented equivalents
  const accentMap: { [key: string]: string } = {
    'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a',
    'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
    'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
    'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
    'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
    'ý': 'y', 'ÿ': 'y',
    'ñ': 'n',
    'ç': 'c'
  };

  // Extract extension
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  // Process the name without extension
  let nameWithoutExt = filename.slice(0, -(ext.length + 1)).toLowerCase();
  
  // Replace accented characters
  nameWithoutExt = nameWithoutExt.split('').map(char => accentMap[char] || char).join('');
  
  // Remove any remaining non-alphanumeric characters
  nameWithoutExt = nameWithoutExt
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    || 'file';

  // Add uniqueness with timestamp and random string
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 6);
  
  // Clean extension and construct final filename
  const cleanExt = ext.replace(/[^a-z0-9]/g, '');

  const finalName = `${nameWithoutExt}_${timestamp}_${randomString}.${cleanExt}`;
  
  console.log('[Chat] Filename sanitization:', {
    original: filename,
    sanitized: finalName
  });

  return finalName;
};

/**
 * Validates a file for upload
 */
export const validateFile = (file: File): string | null => {
  if (!file) return 'No file provided';
  if (file.size > MAX_FILE_SIZE) return 'File is too large (max 100MB)';
  if (!ALLOWED_FILE_TYPES.has(file.type)) return 'File type not supported';
  return null;
};

/**
 * Checks if there is an internet connection
 */
export const checkConnection = (): boolean => {
  return navigator.onLine;
};
