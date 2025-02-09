
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { setupNotifications } from '@/lib/pushNotifications';
import { Bell, BellOff, Download } from 'lucide-react';

interface DeviceInfo {
  platform: string;
  browser: string;
  version: string;
  isStandalone: boolean;
  supportsNotifications: boolean;
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
    
    const iOSVersion = isIOS ? 
      parseInt((userAgent).match(/os (\d+)_/)?.[1] || '0') : 
      0;

    const info: DeviceInfo = {
      platform: isIOS ? 'iOS' : /android/.test(userAgent) ? 'Android' : 'Desktop',
      browser: isSafari ? 'Safari' : 'Chrome/Other',
      version: isIOS ? `iOS ${iOSVersion}` : 'N/A',
      isStandalone,
      supportsNotifications: 'Notification' in window
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

      await setupNotifications(interpreterId);
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

  // If notifications are not supported
  if (!deviceInfo?.supportsNotifications) {
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
      disabled={isSubscribing || permission === 'granted'}
      className="h-9 w-9"
      title={permission === 'granted' ? "Notifications activées" : "Activer les notifications"}
    >
      {permission === 'granted' ? (
        <BellOff className="h-4 w-4" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
    </Button>
  );
};
