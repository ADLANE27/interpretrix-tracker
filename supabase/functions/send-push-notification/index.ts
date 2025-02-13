
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import webPush from 'npm:web-push';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

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
    let body;
    try {
      const rawBody = await req.text();
      console.log('[Push Notification] Raw body:', rawBody);
      body = JSON.parse(rawBody);
    } catch (error) {
      console.error('[Push Notification] Body parse error:', error);
      throw new Error('Invalid request body');
    }

    // Get environment variables
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[Push Notification] Missing VAPID keys');
      throw new Error('Missing VAPID configuration');
    }

    // Configure web-push
    webPush.setVapidDetails(
      'mailto:contact@interpretix.io',
      vapidPublicKey,
      vapidPrivateKey
    );

    // Get subscriptions from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Fetch active subscriptions for the interpreter
    const { error: fetchError, data: subscriptions } = await fetch(
      `${supabaseUrl}/rest/v1/push_subscriptions?status=eq.active&interpreter_id=in.(${body.interpreterIds.join(',')})`,
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

    // Send notifications
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

          const payload: PushPayload = {
            title: body.title || 'Nouvelle notification',
            body: body.body || '',
            data: body.data || {}
          };

          console.log('[Push Notification] Sending to:', sub.endpoint, 'with payload:', payload);
          
          await webPush.sendNotification(subscription, JSON.stringify(payload));
          console.log('[Push Notification] Successfully sent to:', sub.endpoint);

          // Update last successful push
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

          // Handle expired subscriptions
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

    // Process results
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
