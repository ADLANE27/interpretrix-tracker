
interface Window {
  OneSignal: {
    init: (config: {
      appId: string;
      notifyButton?: {
        enable: boolean;
      };
      allowLocalhostAsSecureOrigin?: boolean;
    }) => void;
    showSlidedownPrompt: () => void;
    showNativePrompt: () => Promise<NotificationPermission>;
    getUserId: () => Promise<string>;
    setSubscription: (enabled: boolean) => Promise<void>;
    getNotificationPermission: () => Promise<NotificationPermission>;
    isPushNotificationsEnabled: () => Promise<boolean>;
  };
}
