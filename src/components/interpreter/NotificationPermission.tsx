
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { subscribeToPushNotifications, unsubscribeFromPushNotifications } from '@/lib/pushNotifications';
import { Bell, BellOff, Download } from 'lucide-react';

interface DeviceInfo {
  platform: string;
  browser: string;
  version: string;
  isStandalone: boolean;
  supportsPush: boolean;
}

export const NotificationPermission = ({ interpreterId }: { interpreterId: string }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    detectEnvironment();
    checkNotificationPermission();
  }, []);

  const detectEnvironment = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    // Detect iOS version for Safari
    const iOSVersion = isIOS ? 
      parseInt((userAgent).match(/os (\d+)_/)?.[1] || '0') : 
      0;

    const supportsPush = 'Notification' in window && 
                        'serviceWorker' in navigator && 
                        'PushManager' in window;

    const info: DeviceInfo = {
      platform: isIOS ? 'iOS' : /android/.test(userAgent) ? 'Android' : 'Desktop',
      browser: isSafari ? 'Safari' : 'Chrome/Other',
      version: isIOS ? `iOS ${iOSVersion}` : 'N/A',
      isStandalone,
      supportsPush
    };

    console.log('[Notifications] Environment detected:', info);
    setDeviceInfo(info);
  };

  const checkNotificationPermission = () => {
    if (!('Notification' in window)) {
      console.warn('[Notifications] Notifications API not supported');
      return;
    }

    console.log('[Notifications] Current permission:', Notification.permission);
    setPermission(Notification.permission);
  };

  const handleEnableNotifications = async () => {
    try {
      setIsSubscribing(true);
      console.log('[Notifications] Starting enable process...');

      // First check if we need to prompt for PWA installation
      if (deviceInfo?.platform === 'iOS' && !deviceInfo.isStandalone) {
        toast({
          title: "Installation recommandée",
          description: "Ajoutez l'application à l'écran d'accueil pour de meilleures notifications",
          action: (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                toast({
                  title: "Comment installer",
                  description: "Appuyez sur le bouton 'Partager' puis 'Sur l'écran d'accueil'",
                });
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Installer
            </Button>
          ),
        });
        return;
      }

      const permission = await Notification.requestPermission();
      console.log('[Notifications] Permission result:', permission);

      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      await subscribeToPushNotifications(interpreterId);
      setPermission('granted');
      
      toast({
        title: "Notifications activées",
      });
    } catch (error) {
      console.error('[Notifications] Error:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Notification permission denied') {
          toast({
            title: "Notifications bloquées",
            description: deviceInfo?.platform === 'iOS' ? 
              "Autorisez les notifications dans Réglages > Safari" :
              "Autorisez les notifications dans les paramètres du navigateur",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erreur",
            description: "Impossible d'activer les notifications",
            variant: "destructive",
          });
        }
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDisableNotifications = async () => {
    try {
      console.log('[Notifications] Starting disable process...');
      await unsubscribeFromPushNotifications(interpreterId);
      setPermission('default');
      
      toast({
        title: "Notifications désactivées",
      });
    } catch (error) {
      console.error('[Notifications] Error disabling:', error);
      toast({
        title: "Erreur",
        description: "Impossible de désactiver les notifications",
        variant: "destructive",
      });
    }
  };

  // Show install prompt for iOS users not in standalone mode
  if (deviceInfo?.platform === 'iOS' && !deviceInfo.isStandalone) {
    return (
      <Button 
        variant="outline" 
        size="icon"
        onClick={() => {
          toast({
            title: "Installation recommandée",
            description: "Ajoutez l'application à l'écran d'accueil pour activer les notifications",
            action: (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  toast({
                    title: "Comment installer",
                    description: "Appuyez sur le bouton 'Partager' puis 'Sur l'écran d'accueil'",
                  });
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Installer
              </Button>
            ),
          });
        }}
        className="h-9 w-9"
        title="Installer l'application"
      >
        <Download className="h-4 w-4" />
      </Button>
    );
  }

  // If push notifications are not supported
  if (!deviceInfo?.supportsPush) {
    return (
      <Button 
        variant="outline" 
        size="icon"
        disabled
        className="h-9 w-9"
        title={
          deviceInfo?.platform === 'iOS' ? 
            "Installez l'application pour activer les notifications" :
            "Notifications non supportées sur ce navigateur"
        }
      >
        <Bell className="h-4 w-4" />
      </Button>
    );
  }

  if (permission === 'granted') {
    return (
      <Button 
        variant="outline" 
        size="icon"
        onClick={handleDisableNotifications}
        className="h-9 w-9"
        title="Désactiver les notifications"
      >
        <BellOff className="h-4 w-4" />
      </Button>
    );
  }

  if (permission === 'denied') {
    return (
      <Button 
        variant="outline" 
        size="icon"
        className="h-9 w-9 text-red-600 hover:text-red-700"
        onClick={() => {
          const message = deviceInfo?.platform === 'iOS' ?
            "Autorisez les notifications dans Réglages > Safari" :
            "Autorisez les notifications dans les paramètres du navigateur";
            
          toast({
            title: "Notifications bloquées",
            description: message,
            variant: "destructive",
          });
        }}
        title="Notifications bloquées"
      >
        <Bell className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button 
      onClick={handleEnableNotifications}
      variant="outline"
      size="icon"
      disabled={isSubscribing}
      className="h-9 w-9"
      title="Activer les notifications"
    >
      <Bell className="h-4 w-4" />
    </Button>
  );
};
