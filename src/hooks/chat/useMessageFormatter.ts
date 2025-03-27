
export const useMessageFormatter = () => {
  // Just return the original content as is
  // We're now handling mentions on the server side only
  const formatMessage = (content: string) => {
    return content;
  };

  return {
    formatMessage
  };
};
