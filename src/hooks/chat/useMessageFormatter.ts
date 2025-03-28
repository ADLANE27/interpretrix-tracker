
import { LANGUAGES } from '@/lib/constants';

// Pattern unifié pour détecter les mentions dans les messages
// Cette regex correspond à "@" suivi par un ou plusieurs caractères alphabétiques,
// potentiellement avec des espaces entre eux, pour capturer des noms ou des langues
export const MENTION_PATTERN = /@([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)*)/g;

export const useMessageFormatter = () => {
  // Formate le message pour l'affichage tout en préservant les mentions
  const formatMessage = (content: string) => {
    if (!content) return '';
    
    // Nous préservons le format exact des mentions pour la base de données
    // mais nous pourrions appliquer un formatage supplémentaire ici si nécessaire
    return content;
  };

  // Fonction auxiliaire pour valider les mentions dans un message
  const validateMentions = (content: string): { isValid: boolean; error?: string } => {
    if (!content) return { isValid: true };
    
    const mentions = content.match(MENTION_PATTERN);
    
    if (!mentions) return { isValid: true };
    
    // Vérifier si une mention est trop longue (ce qui pourrait indiquer une mention mal formée)
    for (const mention of mentions) {
      // Extrait le nom/langue mentionné sans le @
      const mentionedText = mention.substring(1);
      
      // Vérifie la longueur maximale d'une mention
      if (mention.length > 50) {
        return { 
          isValid: false, 
          error: "Une mention semble être trop longue. Vérifiez le format des mentions." 
        };
      }
      
      // Vérifie que la mention contient au moins un caractère alphabétique après le @
      if (!/[A-Za-zÀ-ÿ]/.test(mentionedText)) {
        return {
          isValid: false,
          error: "Format de mention invalide. Une mention doit commencer par @ suivi de caractères alphabétiques."
        };
      }
    }
    
    return { isValid: true };
  };

  // Fonction auxiliaire pour normaliser les chaînes pour une meilleure comparaison
  const normalizeString = (str: string): string => {
    return str.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Supprime les diacritiques (accents)
      .replace(/[^a-z0-9\s\-]/g, "") // Supprime les caractères spéciaux mais conserve les tirets
      .replace(/\s+/g, " ")  // Normalise les espaces
      .trim();
  };

  return {
    formatMessage,
    validateMentions,
    normalizeString
  };
};
