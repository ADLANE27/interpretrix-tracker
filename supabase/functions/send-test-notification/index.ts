
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'
import * as webpush from 'npm:web-push@3.6.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Gestion appropriée des requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204
    })
  }

  try {
    // Récupération et validation du corps de la requête
    if (!req.body) {
      throw new Error('Request body is required');
    }

    const { userId, title, body, data } = await req.json()
    console.log('[Push] Received request:', { userId, title, body, data });

    // Validation des variables d'environnement VAPID
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[Push] Missing VAPID configuration');
      throw new Error('Server configuration error: Missing VAPID keys');
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Push] Missing Supabase configuration');
      throw new Error('Server configuration error: Missing Supabase configuration');
    }

    // Configuration de web-push avec les clés VAPID
    webpush.setVapidDetails(
      'mailto:contact@aftrad.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    // Initialisation du client Supabase
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    console.log('[Push] Fetching subscription for user:', userId);

    // Récupération de la souscription de l'utilisateur
    const { data: subscriptionData, error: subError } = await supabase
      .from('user_push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (subError || !subscriptionData) {
      console.error('[Push] Subscription fetch error:', subError);
      throw new Error('No subscription found for this user');
    }

    const subscription = subscriptionData.subscription;
    console.log('[Push] Using subscription:', subscription);

    // Validation de la souscription
    if (!subscription?.endpoint || !subscription?.keys?.auth || !subscription?.keys?.p256dh) {
      console.error('[Push] Invalid subscription format:', subscription);
      throw new Error('Invalid subscription format');
    }

    // Préparation du payload de la notification
    const pushPayload = JSON.stringify({
      title,
      body,
      data,
      icon: '/favicon.ico',
      badge: '/favicon.ico'
    });

    console.log('[Push] Sending notification with payload:', pushPayload);

    // Envoi de la notification
    const pushResult = await webpush.sendNotification(
      subscription,
      pushPayload
    );

    console.log('[Push] Notification sent successfully:', pushResult.statusCode);

    return new Response(
      JSON.stringify({
        message: 'Push notification sent successfully',
        status: pushResult.statusCode
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[Push] Function error:', error);

    // Si l'erreur est liée à une souscription expirée (404) ou invalide (410)
    if (error instanceof webpush.WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
      console.log('[Push] Subscription is expired or invalid');
      
      try {
        // Récupérer l'userId depuis le corps de la requête initiale
        const { userId } = await req.json();
        
        if (userId) {
          const supabaseUrl = Deno.env.get('SUPABASE_URL');
          const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
          
          if (supabaseUrl && supabaseAnonKey) {
            const supabase = createClient(supabaseUrl, supabaseAnonKey);
            
            // Supprimer la souscription invalide
            const { error: deleteError } = await supabase
              .from('user_push_subscriptions')
              .delete()
              .eq('user_id', userId);

            if (deleteError) {
              console.error('[Push] Error deleting invalid subscription:', deleteError);
            } else {
              console.log('[Push] Invalid subscription deleted successfully');
            }
          }
        }
      } catch (cleanupError) {
        console.error('[Push] Error during cleanup:', cleanupError);
      }
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})
