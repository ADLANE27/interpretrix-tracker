
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import webPush from 'npm:web-push';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('[Push Notification] Function called with method:', req.method);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      }
    });
  }

  try {
    // Validate method
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    // Parse body
    let requestBody;
    try {
      const rawBody = await req.text();
      console.log('[Push Notification] Raw body:', rawBody);
      requestBody = JSON.parse(rawBody);
    } catch (error) {
      console.error('[Push Notification] Body parse error:', error);
      throw new Error('Invalid request body');
    }

    // Validate body structure
    if (!requestBody?.message?.interpreterIds?.length) {
      console.error('[Push Notification] Invalid message format:', requestBody);
      throw new Error('Invalid message format: missing interpreterIds');
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!supabaseUrl || !supabaseKey || !vapidPublicKey || !vapidPrivateKey) {
      console.error('[Push Notification] Missing environment variables:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        hasVapidPublic: !!vapidPublicKey,
        hasVapidPrivate: !!vapidPrivateKey
      });
      throw new Error('Missing required environment variables');
    }

    // Configurer web-push avec les clés VAPID
    webPush.setVapidDetails(
      'mailto:contact@interpretix.io',
      vapidPublicKey,
      vapidPrivateKey
    );

    // Récupérer les souscriptions actives des interprètes
    const { error: fetchError, data: subscriptions } = await fetch(
      `${supabaseUrl}/rest/v1/push_subscriptions?status=eq.active&interpreter_id=in.(${requestBody.message.interpreterIds.join(',')})`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    ).then(res => res.json());

    if (fetchError) throw fetchError;

    console.log('[Push Notification] Found subscriptions:', subscriptions);

    if (!subscriptions?.length) {
      return new Response(
        JSON.stringify({ message: 'No active subscriptions found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      );
    }

    // Envoyer les notifications
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const subscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };

          const payload = JSON.stringify({
            title: requestBody.message.title || 'Nouvelle notification',
            body: requestBody.message.body || '',
            data: requestBody.message.data || {},
            icon: '/favicon.ico',
            badge: '/favicon.ico'
          });

          console.log('[Push Notification] Sending to:', sub.endpoint, 'with payload:', payload);
          
          await webPush.sendNotification(subscription, payload);
          console.log('[Push Notification] Successfully sent to:', sub.endpoint);

          // Mettre à jour la date du dernier push réussi
          await fetch(
            `${supabaseUrl}/rest/v1/push_subscriptions?id=eq.${sub.id}`,
            {
              method: 'PATCH',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({
                last_successful_push: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
            }
          );

          return { success: true, subscriptionId: sub.id };
        } catch (error) {
          console.error('[Push Notification] Send error for endpoint:', sub.endpoint, error);

          // Si la souscription est expirée, la marquer comme telle
          if (error.statusCode === 410 || error.statusCode === 404) {
            await fetch(
              `${supabaseUrl}/rest/v1/push_subscriptions?id=eq.${sub.id}`,
              {
                method: 'PATCH',
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                  status: 'expired',
                  updated_at: new Date().toISOString()
                })
              }
            );
          }

          return {
            success: false,
            subscriptionId: sub.id,
            error: error.message,
            statusCode: error.statusCode
          };
        }
      })
    );

    // Traiter les résultats
    const summary = {
      total: results.length,
      successful: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
      failed: results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length,
      details: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason })
    };

    console.log('[Push Notification] Final results:', JSON.stringify(summary, null, 2));

    return new Response(
      JSON.stringify({ success: true, results: summary }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[Push Notification] Critical error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
