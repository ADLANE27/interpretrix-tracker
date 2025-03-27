
export const useMessageFormatter = () => {
  // No formatting needed anymore since we removed language mentions
  const formatMessage = (content: string) => {
    return content;
  };

  return {
    formatMessage
  };
};
