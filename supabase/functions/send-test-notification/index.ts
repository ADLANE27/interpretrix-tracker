
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webPush from 'https://esm.sh/web-push@3.6.6'

// Définition des types pour la sécurité du typage
interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime?: number | null;
}

interface NotificationRequest {
  userId: string;
  title: string;
  body: string;
  data: {
    url: string;
  };
}

// En-têtes CORS plus permissifs pour le développement
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  try {
    // Gestion des requêtes préliminaires CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Headers': req.headers.get('Access-Control-Request-Headers') || '*'
        }
      });
    }

    console.log('[send-test-notification] Démarrage du processus de notification');
    
    // Initialisation du client Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Configuration Supabase manquante');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Configuration VAPID
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('Configuration VAPID manquante');
    }

    webPush.setVapidDetails(
      'mailto:contact@aftrad.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    // Analyse et validation des données de la requête
    const requestData = await req.json() as NotificationRequest;
    console.log('[send-test-notification] Données de la requête:', requestData);

    if (!requestData.userId || !requestData.title || !requestData.body) {
      throw new Error('Champs requis manquants: userId, title, et body');
    }

    // Récupération de l'abonnement de l'utilisateur
    const { data: subscriptionData, error: subscriptionError } = await supabaseClient
      .from('user_push_subscriptions')
      .select('subscription')
      .eq('user_id', requestData.userId)
      .single();

    if (subscriptionError || !subscriptionData?.subscription) {
      throw new Error(`Aucun abonnement valide trouvé pour l'utilisateur ${requestData.userId}`);
    }

    // Validation des données d'abonnement
    const subscription = subscriptionData.subscription as PushSubscription;
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      throw new Error('Format d\'abonnement invalide');
    }

    console.log('[send-test-notification] Envoi de la notification push avec les données:', {
      title: requestData.title,
      body: requestData.body,
      data: requestData.data
    });

    try {
      await webPush.sendNotification(
        subscription,
        JSON.stringify({
          title: requestData.title,
          body: requestData.body,
          ...requestData.data
        })
      );
      console.log('[send-test-notification] Notification push envoyée avec succès');

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Notification push envoyée avec succès' 
        }),
        {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
          status: 200,
        }
      );
    } catch (pushError) {
      console.error('[send-test-notification] Erreur push:', pushError);
      
      // Gestion des abonnements expirés
      if (pushError.statusCode === 410) {
        console.log('[send-test-notification] Abonnement expiré, suppression de la base de données');
        await supabaseClient
          .from('user_push_subscriptions')
          .delete()
          .eq('user_id', requestData.userId);
          
        throw new Error('SUBSCRIPTION_EXPIRED');
      }
      
      throw pushError;
    }
  } catch (error) {
    console.error('[send-test-notification] Erreur:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erreur interne du serveur',
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.statusCode || 500,
      }
    );
  }
});
