
/**
 * Formats a phone number for display.
 * Example: "1234567890" -> "+1 (234) 567-890"
 * @param phoneNumber The phone number to format
 * @returns The formatted phone number
 */
export function formatPhoneNumber(phoneNumber: string | null): string {
  if (!phoneNumber) return '';
  
  // Remove any non-digit characters from the phone number
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Format based on length
  if (digits.length === 10) {
    // US format: (XXX) XXX-XXXX
    return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
  } else if (digits.length > 10) {
    // International format with country code
    const countryCode = digits.substring(0, digits.length - 10);
    const areaCode = digits.substring(digits.length - 10, digits.length - 7);
    const firstPart = digits.substring(digits.length - 7, digits.length - 4);
    const lastPart = digits.substring(digits.length - 4);
    return `+${countryCode} (${areaCode}) ${firstPart}-${lastPart}`;
  } else if (digits.length > 6) {
    // Shorter format: XXX-XXXX
    return `${digits.substring(0, 3)}-${digits.substring(3)}`;
  }
  
  // If none of the above patterns match, return the original number
  return phoneNumber;
}
