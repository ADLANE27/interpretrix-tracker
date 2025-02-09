
// Define a set of distinct colors for users
const MEMBER_COLORS = [
  { from: '#FF6B6B', to: '#EE5253' }, // Red
  { from: '#4ECDC4', to: '#45B7AF' }, // Teal
  { from: '#FFD93D', to: '#F6C90E' }, // Yellow
  { from: '#6C5CE7', to: '#5F3DC4' }, // Purple
  { from: '#A8E6CF', to: '#98D8C1' }, // Mint
  { from: '#FF8B94', to: '#FF717B' }, // Pink
  { from: '#98ACFF', to: '#6C8AFF' }, // Light Blue
  { from: '#FFA07A', to: '#FF7F50' }, // Coral
  { from: '#88D8B0', to: '#6FC393' }, // Green
  { from: '#C3AED6', to: '#B39DDB' }, // Lavender
  { from: '#FFB6B9', to: '#FF9AA2' }, // Light Pink
  { from: '#957DAD', to: '#7C67AB' }, // Deep Purple
  { from: '#E6B89C', to: '#D4A373' }, // Tan
  { from: '#9ADCFF', to: '#72CFF9' }, // Sky Blue
  { from: '#CEE5D0', to: '#B8D9B8' }, // Sage
];

export const getUserColors = (userId: string) => {
  // Use the user ID to consistently get the same color for each user
  const colorIndex = Math.abs(hashCode(userId)) % MEMBER_COLORS.length;
  return MEMBER_COLORS[colorIndex];
};

// Simple string hash function
const hashCode = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
};
