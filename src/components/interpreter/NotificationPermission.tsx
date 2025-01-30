import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { subscribeToPushNotifications } from '@/lib/pushNotifications';
import { Bell } from 'lucide-react';

export const NotificationPermission = ({ interpreterId }: { interpreterId: string }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const handleEnableNotifications = async () => {
    try {
      await subscribeToPushNotifications(interpreterId);
      setPermission('granted');
      toast({
        title: "Notifications activées",
        description: "Vous recevrez des notifications pour les nouvelles missions",
      });
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'activer les notifications",
        variant: "destructive",
      });
    }
  };

  if (permission === 'granted') {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <Bell className="h-4 w-4" />
        <span>Notifications activées</span>
      </div>
    );
  }

  return (
    <Button 
      onClick={handleEnableNotifications}
      variant="outline"
      className="flex items-center gap-2"
    >
      <Bell className="h-4 w-4" />
      Activer les notifications
    </Button>
  );
};