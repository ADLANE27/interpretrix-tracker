
type OneSignalConfig = {
  appId: string;
  autoResubscribe?: boolean;
  serviceWorkerParam?: { scope: string };
  serviceWorkerPath?: string;
  subdomainName?: string;
  allowLocalhostAsSecureOrigin?: boolean;
  requiresUserPrivacyConsent?: boolean;
  promptOptions?: {
    slidedown?: {
      prompts: [{
        type: "push" | "category" | "sms" | "email" | "sms_and_email",
        autoPrompt: boolean,
        text: {
          actionMessage: string,
          acceptButton: string,
          cancelButton: string,
        },
        delay: {
          pageViews?: number,
          timeDelay?: number,
        }
      }]
    }
  };
  welcomeNotification?: {
    disable: boolean,
    title?: string,
    message?: string,
    url?: string
  };
  notifyButton?: {
    enable?: boolean,
    displayPredicate?: () => boolean,
    size?: 'small' | 'medium' | 'large',
    theme?: 'default' | 'inverse',
    position?: 'bottom-left' | 'bottom-right',
    offset?: {
      bottom?: string | number,
      left?: string | number,
      right?: string | number
    },
    text?: {
      'tip.state.unsubscribed'?: string,
      'tip.state.subscribed'?: string,
      'tip.state.blocked'?: string,
      'message.prenotify'?: string,
      'message.action.subscribed'?: string,
      'message.action.resubscribed'?: string,
      'message.action.unsubscribed'?: string,
      'dialog.main.title'?: string,
      'dialog.main.button.subscribe'?: string,
      'dialog.main.button.unsubscribe'?: string,
      'dialog.blocked.title'?: string,
      'dialog.blocked.message'?: string
    }
  };
  persistNotification?: boolean;
  webhooks?: {
    cors?: boolean;
    'notification.displayed'?: string;
    'notification.clicked'?: string;
    'notification.dismissed'?: string;
  };
  path?: string;
  userConfig?: {
    appId?: string;
    autoRegister?: boolean;
    autoResubscribe?: boolean;
    path?: string;
    serviceWorkerPath?: string;
    subdomainName?: string;
    safari_web_id?: string;
  };
};

type OneSignalFunctions = {
  init: (config: OneSignalConfig) => Promise<void>;
  showSlidedownPrompt: () => void;
  showNativePrompt: () => Promise<NotificationPermission>;
  showCategorySlidedown: () => void;
  getUserId: () => Promise<string>;
  getSubscription: () => Promise<boolean>;
  setSubscription: (enabled: boolean) => Promise<void>;
  getNotificationPermission: () => Promise<NotificationPermission>;
  isPushNotificationsEnabled: () => Promise<boolean>;
  isPushNotificationsSupported: () => Promise<boolean>;
  setDefaultNotificationUrl: (url: string) => void;
  setDefaultTitle: (title: string) => void;
  getTags: () => Promise<Record<string, string>>;
  sendTag: (key: string, value: string) => Promise<void>;
  sendTags: (tags: Record<string, string>) => Promise<void>;
  deleteTag: (key: string) => Promise<void>;
  deleteTags: (keys: string[]) => Promise<void>;
  addListenerForNotificationOpened: (callback: (data: any) => void) => void;
  getEmailId: () => Promise<string | undefined>;
  getSMSId: () => Promise<string | undefined>;
  setEmail: (email: string) => Promise<void>;
  setSMSNumber: (smsNumber: string) => Promise<void>;
  setExternalUserId: (externalUserId: string) => Promise<void>;
  removeExternalUserId: () => Promise<void>;
  logout: () => Promise<void>;
};

interface Window {
  OneSignal: (OneSignalFunctions & { push: (f: () => void) => void }) | any[];
  OneSignalDeferred?: ((OneSignal: OneSignalFunctions) => void)[];
  oneSignalInitPromise?: Promise<void>;
  resolveOneSignal?: () => void;
  rejectOneSignal?: (error: any) => void;
}

