
// Define a set of distinct colors for users with enhanced gradients
const MEMBER_COLORS = [
  // Enhanced purple tones
  { from: '#9b87f5', to: '#8B5CF6' }, // Primary Purple
  { from: '#D946EF', to: '#C026D3' }, // Magenta Pink
  
  // Enhanced orange and blue tones
  { from: '#F97316', to: '#EA580C' }, // Bright Orange
  { from: '#0EA5E9', to: '#0284C7' }, // Ocean Blue
  
  // Enhanced neutral tones
  { from: '#8E9196', to: '#6B7280' }, // Neutral Gray
  { from: '#7E69AB', to: '#6E59A5' }, // Secondary Purple
  
  // Enhanced soft tones
  { from: '#FEC6A1', to: '#FDA982' }, // Soft Orange
  { from: '#D3E4FD', to: '#BFDBFE' }, // Soft Blue
  { from: '#FFDEE2', to: '#FFD1D7' }, // Soft Pink
  { from: '#E5DEFF', to: '#D4CCFF' }, // Soft Purple
  { from: '#F2FCE2', to: '#E7F9D1' }, // Soft Green
  { from: '#FEF7CD', to: '#FEF3B5' }, // Soft Yellow
  { from: '#FDE1D3', to: '#FCD5C2' }, // Soft Peach
  
  // Enhanced bright tones
  { from: '#1EAEDB', to: '#0EA5E9' }, // Bright Blue
  { from: '#33C3F0', to: '#22B8E6' }, // Sky Blue Bright
  
  // Original colors with enhanced gradients
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
