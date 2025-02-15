
interface Window {
  OneSignal: {
    init: (config: {
      appId: string;
      notifyButton?: {
        enable: boolean;
      };
      allowLocalhostAsSecureOrigin?: boolean;
      subdomainName?: string;
      webhooks?: {
        cors?: boolean;
        'notification.displayed'?: string;
        'notification.clicked'?: string;
        'notification.dismissed'?: string;
      };
      persistNotification?: boolean;
      serviceWorkerPath?: string;
      path?: string;
    }) => Promise<void>;
    showSlidedownPrompt: () => void;
    showNativePrompt: () => Promise<NotificationPermission>;
    getUserId: () => Promise<string>;
    setSubscription: (enabled: boolean) => Promise<void>;
    getNotificationPermission: () => Promise<NotificationPermission>;
    isPushNotificationsEnabled: () => Promise<boolean>;
    isPushNotificationsSupported: () => Promise<boolean>;
  };
  OneSignalDeferred: ((OneSignal: Window['OneSignal']) => void)[];
}
