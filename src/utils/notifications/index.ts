
import { supabase } from "@/integrations/supabase/client";

export async function sendNotification(userId: string, title: string, body: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Enregistrer dans l'historique des notifications
    const { error: historyError } = await supabase.from('notification_history').insert({
      recipient_id: userId,
      notification_type: 'mission',
      content: {
        title,
        body,
        sender_id: user.id
      }
    });

    if (historyError) {
      console.error('Error saving to notification history:', historyError);
      return false;
    }

    // Envoyer la notification push via l'edge function
    const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
      body: {
        interpreterIds: [userId],
        title,
        body,
        data: {
          timestamp: new Date().toISOString(),
          sender_id: user.id
        }
      }
    });

    if (pushError) {
      console.error('Error sending push notification:', pushError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
}

export async function subscribeToNotifications() {
  try {
    // Demander la permission pour les notifications
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    // Enregistrer le Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    console.log('Service Worker registered:', registration);

    // Récupérer la clé VAPID publique
    const { data: vapidData, error: vapidError } = await supabase.functions.invoke('get-vapid-public-key');
    if (vapidError || !vapidData?.vapidPublicKey) {
      throw new Error('Could not get VAPID key');
    }

    // Convertir la clé VAPID en Uint8Array
    const vapidKey = vapidData.vapidPublicKey;

    // S'abonner aux notifications push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey
    });

    // Enregistrer l'abonnement dans la base de données
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error: subError } = await supabase.from('push_subscriptions').upsert({
      interpreter_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: Buffer.from(subscription.getKey('p256dh') as ArrayBuffer).toString('base64'),
      auth: Buffer.from(subscription.getKey('auth') as ArrayBuffer).toString('base64'),
      user_agent: navigator.userAgent,
      status: 'active'
    }, {
      onConflict: 'interpreter_id,endpoint'
    });

    if (subError) throw subError;

    return true;
  } catch (error) {
    console.error('Error subscribing to notifications:', error);
    return false;
  }
}

export async function unsubscribeFromNotifications() {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      throw new Error('No service worker registration found');
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      throw new Error('No push subscription found');
    }

    // Récupérer l'utilisateur courant
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Mettre à jour le statut de l'abonnement dans la base de données
    const { error: updateError } = await supabase.from('push_subscriptions')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('interpreter_id', user.id)
      .eq('endpoint', subscription.endpoint);

    if (updateError) throw updateError;

    // Désabonner du push manager
    await subscription.unsubscribe();

    return true;
  } catch (error) {
    console.error('Error unsubscribing from notifications:', error);
    return false;
  }
}
