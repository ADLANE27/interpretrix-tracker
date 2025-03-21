
import { colorOptions } from "@/components/interpreter/notes/ColorPicker";
import DOMPurify from 'dompurify';

export const getNoteColorStyles = (color: string) => {
  const colorOption = colorOptions.find(option => option.color === color);
  
  if (!colorOption || colorOption.color === 'transparent') {
    return {};
  }

  return {
    backgroundColor: colorOption.color,
    color: colorOption.textColor,
    borderColor: colorOption.borderColor
  };
};

export const sanitizeHtml = (html: string): string => {
  if (typeof window === 'undefined') return '';
  
  // Configure DOMPurify to allow certain tags and attributes
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'u', 'ul', 'ol', 'li', 'span'],
    ALLOWED_ATTR: ['style', 'class'],
  });
  
  return clean;
};

export const truncateHtml = (html: string, maxLength: number = 150): string => {
  if (!html) return '';
  
  // Create a DOM element to parse the HTML
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const textContent = doc.body.textContent || '';
  
  if (textContent.length <= maxLength) {
    return html;
  }
  
  // Truncate the text content
  const truncated = textContent.substring(0, maxLength) + '...';
  
  return truncated;
};
