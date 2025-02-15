
interface Window {
  OneSignal?: {
    init: (config: any) => void;
    getUserId: () => Promise<string>;
    showNativePrompt: () => Promise<NotificationPermission>;
    showSlidedownPrompt: () => void;
    setSubscription: (enabled: boolean) => Promise<void>;
  };
}
