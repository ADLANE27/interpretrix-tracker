
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js';
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

    // Log headers for debugging
    console.log('[Push Notification] Headers:', JSON.stringify(Object.fromEntries(req.headers.entries())));

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

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Configure Web Push
    webPush.setVapidDetails(
      'mailto:contact@interpretix.io',
      vapidPublicKey,
      vapidPrivateKey
    );

    // Get active subscriptions
    console.log('[Push Notification] Fetching subscriptions for interpreters:', requestBody.message.interpreterIds);
    
    const { data: subscriptions, error: dbError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('status', 'active')
      .in('interpreter_id', requestBody.message.interpreterIds);

    if (dbError) {
      console.error('[Push Notification] Database error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log('[Push Notification] Found subscriptions:', subscriptions);

    if (!subscriptions?.length) {
      console.log('[Push Notification] No active subscriptions found');
      return new Response(
        JSON.stringify({ message: 'No active subscriptions found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      );
    }

    // Send notifications
    console.log('[Push Notification] Attempting to send to', subscriptions.length, 'subscriptions');
    
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

          // Update last successful push
          const { error: updateError } = await supabase
            .from('push_subscriptions')
            .update({
              last_successful_push: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', sub.id);

          if (updateError) {
            console.error('[Push Notification] Error updating subscription:', updateError);
          }

          return { success: true, subscriptionId: sub.id };
        } catch (error) {
          console.error('[Push Notification] Send error for endpoint:', sub.endpoint, error);

          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log('[Push Notification] Marking subscription as expired:', sub.id);
            
            // Update expired subscription
            const { error: updateError } = await supabase
              .from('push_subscriptions')
              .update({
                status: 'expired',
                updated_at: new Date().toISOString()
              })
              .eq('id', sub.id);

            if (updateError) {
              console.error('[Push Notification] Error updating expired subscription:', updateError);
            }
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
