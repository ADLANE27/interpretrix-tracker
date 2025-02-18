
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

interface PushSubscriptionData {
  endpoint: string;
  expirationTime: number | null;
  keys: PushSubscriptionKeys;
}

export const registerPushNotifications = async () => {
  try {
    // 1. Vérifier si le Service Worker et Push sont supportés
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Les notifications push ne sont pas supportées par ce navigateur');
    }

    // 2. Demander la permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Permission refusée pour les notifications');
    }

    // 3. Récupérer la session utilisateur
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('Utilisateur non authentifié');
    }

    // 4. Récupérer l'enregistrement du Service Worker
    const registration = await navigator.serviceWorker.ready;
    console.log('Service Worker prêt pour les notifications push');

    // 5. S'abonner aux notifications push
    const subscribeOptions = {
      userVisibleOnly: true,
      applicationServerKey: process.env.VAPID_PUBLIC_KEY
    };

    const pushSubscription = await registration.pushManager.subscribe(subscribeOptions);
    console.log('Souscription push créée:', pushSubscription);

    // 6. Convertir la souscription en objet compatible JSON
    const subscriptionData: PushSubscriptionData = {
      endpoint: pushSubscription.endpoint,
      expirationTime: pushSubscription.expirationTime,
      keys: {
        p256dh: pushSubscription.toJSON().keys.p256dh,
        auth: pushSubscription.toJSON().keys.auth
      }
    };

    // 7. Enregistrer dans Supabase - Convertir explicitement en JSON
    const { error: upsertError } = await supabase
      .from('user_push_subscriptions')
      .upsert({
        user_id: session.user.id,
        subscription: JSON.parse(JSON.stringify(subscriptionData)) as Json
      });

    if (upsertError) {
      throw upsertError;
    }

    return {
      success: true,
      message: 'Notifications push activées avec succès'
    };

  } catch (error) {
    console.error('Erreur lors de l\'enregistrement des notifications push:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erreur lors de l\'activation des notifications push'
    };
  }
};

export const unregisterPushNotifications = async () => {
  try {
    // 1. Récupérer la session utilisateur
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('Utilisateur non authentifié');
    }

    // 2. Récupérer l'enregistrement du Service Worker
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    // 3. Désabonner si une souscription existe
    if (subscription) {
      await subscription.unsubscribe();
    }

    // 4. Supprimer de Supabase
    const { error: deleteError } = await supabase
      .from('user_push_subscriptions')
      .delete()
      .eq('user_id', session.user.id);

    if (deleteError) {
      throw deleteError;
    }

    return {
      success: true,
      message: 'Notifications push désactivées avec succès'
    };

  } catch (error) {
    console.error('Erreur lors de la désactivation des notifications push:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erreur lors de la désactivation des notifications push'
    };
  }
};

export const checkPushNotificationStatus = async () => {
  try {
    // Vérifier si les notifications sont supportées
    if (!('Notification' in window)) {
      return { enabled: false, permission: 'unsupported' };
    }

    // Vérifier la permission actuelle
    const permission = Notification.permission;

    // Vérifier si l'utilisateur est connecté
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { enabled: false, permission };
    }

    // Vérifier si une souscription existe dans Supabase
    const { data: subscriptionData } = await supabase
      .from('user_push_subscriptions')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    // Vérifier si la souscription est active dans le navigateur
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    const enabled = !!(subscription && subscriptionData);

    return {
      enabled,
      permission,
      subscription: enabled ? subscription : null
    };

  } catch (error) {
    console.error('Erreur lors de la vérification du statut des notifications:', error);
    return {
      enabled: false,
      permission: Notification.permission,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
};
