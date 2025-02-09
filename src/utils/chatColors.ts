
/**
 * Color palette inspired by Slack's design system
 * Selected for good contrast with white text and visual harmony
 */
export const userColors = [
  "#2B7BB9", // Blue
  "#9C3D54", // Ruby
  "#36A64F", // Green
  "#E06B56", // Coral
  "#4A154B", // Purple
  "#D6A13C", // Gold
  "#3E991F", // Lime
  "#4F5B93", // Indigo
  "#DB61A2", // Pink
  "#1E856C", // Teal
  "#DC7633", // Orange
  "#8E44AD", // Violet
  "#2E856E", // Emerald
  "#CC5D4C", // Red
  "#4A5D7D"  // Steel
];

/**
 * Simple hash function to get a consistent number from a string
 */
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
};

/**
 * Get a consistent color for a user based on their ID
 */
export const getUserColor = (userId: string): string => {
  const index = hashString(userId) % userColors.length;
  return userColors[index];
};

