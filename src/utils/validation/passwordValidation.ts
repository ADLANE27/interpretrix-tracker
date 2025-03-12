
export const validatePassword = (password?: string): { isValid: boolean; error?: string } => {
  if (!password) {
    return { isValid: true }; // Password is optional, will be auto-generated if not provided
  }

  if (typeof password !== 'string') {
    return { isValid: false, error: 'Le mot de passe doit être une chaîne de caractères' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Le mot de passe doit contenir au moins 8 caractères' };
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    return { isValid: false, error: 'Le mot de passe doit contenir au moins un chiffre' };
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Le mot de passe doit contenir au moins une majuscule' };
  }

  return { isValid: true };
};
