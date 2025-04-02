
import React from 'react';
import { useEffect, useState } from 'react';
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useBrowserNotification } from '@/hooks/useBrowserNotification';
import { Bell, Volume2, Info, MessageSquare, AtSign, Reply } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { eventEmitter, EVENT_NOTIFICATION_SETTINGS_UPDATED } from '@/lib/events';

interface NotificationSettingsProps {
  onClose?: () => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ onClose }) => {
  const { toast } = useToast();
  const { 
    permission,
    requestPermission,
    settings,
    toggleNotifications,
    updateNotificationSettings
  } = useBrowserNotification();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(settings.enabled);
  const [notificationTypes, setNotificationTypes] = useState(settings.notifications);
  
  useEffect(() => {
    setNotificationsEnabled(settings.enabled);
    setNotificationTypes(settings.notifications);
  }, [settings]);
  
  const handleToggleNotifications = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    toggleNotifications(enabled);
    
    // If enabling notifications but don't have permission, request it
    if (enabled && permission !== 'granted') {
      requestPermission();
    }
    
    eventEmitter.emit(EVENT_NOTIFICATION_SETTINGS_UPDATED, { enabled });
  };
  
  const handleToggleNotificationType = (type: keyof typeof notificationTypes, enabled: boolean) => {
    const updatedTypes = {
      ...notificationTypes,
      [type]: enabled
    };
    
    setNotificationTypes(updatedTypes);
    updateNotificationSettings(updatedTypes);
    eventEmitter.emit(EVENT_NOTIFICATION_SETTINGS_UPDATED, { notifications: updatedTypes });
  };
  
  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    
    if (granted) {
      toast({
        title: "Notifications activées",
        description: "Vous recevrez désormais des notifications lorsque vous êtes mentionné ou recevez des messages."
      });
    } else {
      toast({
        title: "Notifications bloquées",
        description: "Vous avez refusé les notifications. Vous pouvez les activer dans les paramètres de votre navigateur.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Paramètres de notification
        </CardTitle>
        <CardDescription>
          Configurez la façon dont vous recevez les notifications de l'application
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifications">Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Activer ou désactiver toutes les notifications
              </p>
            </div>
            <Switch
              id="notifications"
              checked={notificationsEnabled}
              onCheckedChange={handleToggleNotifications}
            />
          </div>
          
          {permission !== 'granted' && (
            <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-md flex items-start gap-2">
              <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold">Autorisation requise</h4>
                <p className="text-xs text-muted-foreground">
                  Vous devez autoriser les notifications dans votre navigateur pour recevoir des alertes
                </p>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="mt-2"
                  onClick={handleRequestPermission}
                >
                  <Bell className="h-4 w-4 mr-1" />
                  Autoriser les notifications
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {notificationsEnabled && (
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-medium">Types de notifications</h3>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AtSign className="h-4 w-4 text-blue-500" />
                <Label htmlFor="mentions">Mentions</Label>
              </div>
              <Switch
                id="mentions"
                disabled={!notificationsEnabled}
                checked={notificationTypes.mentions}
                onCheckedChange={(checked) => handleToggleNotificationType('mentions', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Reply className="h-4 w-4 text-green-500" />
                <Label htmlFor="replies">Réponses aux fils</Label>
              </div>
              <Switch
                id="replies"
                disabled={!notificationsEnabled}
                checked={notificationTypes.replies}
                onCheckedChange={(checked) => handleToggleNotificationType('replies', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-purple-500" />
                <Label htmlFor="directMessages">Messages directs</Label>
              </div>
              <Switch
                id="directMessages"
                disabled={!notificationsEnabled}
                checked={notificationTypes.directMessages}
                onCheckedChange={(checked) => handleToggleNotificationType('directMessages', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-orange-500" />
                <Label htmlFor="sound">Son de notification</Label>
              </div>
              <Switch
                id="sound"
                disabled={!notificationsEnabled}
                checked={true}
              />
            </div>
          </div>
        )}
      </CardContent>
      
      {onClose && (
        <CardFooter className="border-t pt-4 justify-end">
          <Button onClick={onClose}>
            Fermer
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};
