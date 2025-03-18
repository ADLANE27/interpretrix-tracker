
interface UseChannelInitializationProps {
  onChannelError: () => void;
  handleReconnect: () => void;  // Updated to not require parameters
  isExplicitDisconnect: boolean;
  isReconnecting: boolean;
  setConnectionStatus: (status: 'connected' | 'connecting' | 'disconnected') => void;
  updateLastHeartbeat: () => void;
  setupHeartbeat: (
    channel: RealtimeChannel,
    isExplicitDisconnect: boolean,
    isReconnecting: boolean
  ) => boolean;
  validateChannelPresence: (channel: RealtimeChannel) => Promise<boolean>;
}
