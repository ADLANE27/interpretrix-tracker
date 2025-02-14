
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js';
import webPush from 'npm:web-push';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('[Push] New request received:', req.method);

  if (req.method === 'OPTIONS') {
    console.log('[Push] Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get configuration
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    // Log configuration status
    console.log('[Push] Configuration check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      hasVapidPublicKey: !!vapidPublicKey,
      hasVapidPrivateKey: !!vapidPrivateKey
    });

    if (!supabaseUrl || !supabaseKey || !vapidPublicKey || !vapidPrivateKey) {
      console.error('[Push] Missing configuration:', {
        supabaseUrl: !supabaseUrl,
        supabaseKey: !supabaseKey,
        vapidPublicKey: !vapidPublicKey,
        vapidPrivateKey: !vapidPrivateKey
      });
      throw new Error('Missing configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse and validate request body
    const requestBody = await req.json();
    console.log('[Push] Request body:', {
      interpreterIds: requestBody.interpreterIds?.length || 0,
      hasTitle: !!requestBody.title,
      hasBody: !!requestBody.body,
      hasData: !!requestBody.data
    });

    const { interpreterIds, title, body, data } = requestBody;

    if (!interpreterIds || !Array.isArray(interpreterIds)) {
      console.error('[Push] Invalid interpreter IDs:', interpreterIds);
      throw new Error('Invalid interpreter IDs');
    }

    // Log interpreter IDs being processed
    console.log('[Push] Processing notifications for interpreters:', interpreterIds);

    // Configure web-push with VAPID details
    try {
      webPush.setVapidDetails(
        'mailto:contact@interpretix.io',
        vapidPublicKey,
        vapidPrivateKey
      );
      console.log('[Push] VAPID configuration successful');
    } catch (vapidError) {
      console.error('[Push] VAPID configuration error:', vapidError);
      throw vapidError;
    }

    // Get active subscriptions
    const { data: subscriptions, error: dbError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('interpreter_id', interpreterIds)
      .eq('status', 'active');

    if (dbError) {
      console.error('[Push] Database error fetching subscriptions:', dbError);
      throw dbError;
    }

    console.log('[Push] Found subscriptions:', {
      count: subscriptions?.length || 0,
      interpreterIds: subscriptions?.map(s => s.interpreter_id) || []
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          console.log('[Push] Processing subscription:', {
            id: sub.id,
            interpreterId: sub.interpreter_id,
            hasEndpoint: !!sub.endpoint,
            hasKeys: !!(sub.p256dh && sub.auth)
          });

          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };

          const payload = {
            title,
            body,
            data: {
              ...data,
              timestamp: new Date().toISOString()
            }
          };

          console.log('[Push] Sending notification with payload:', {
            title,
            body,
            hasData: !!data
          });

          await webPush.sendNotification(
            pushSubscription,
            JSON.stringify(payload)
          );

          console.log('[Push] Notification sent successfully to:', sub.interpreter_id);

          // Update last successful push
          const { error: updateError } = await supabase
            .from('push_subscriptions')
            .update({ 
              last_successful_push: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', sub.id);

          if (updateError) {
            console.error('[Push] Error updating subscription:', updateError);
          }

          return { success: true, subscription: sub.id };
        } catch (error) {
          console.error('[Push] Error sending notification:', {
            subscriptionId: sub.id,
            interpreterId: sub.interpreter_id,
            error: error.message,
            statusCode: error.statusCode
          });

          // Handle expired subscriptions
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log('[Push] Marking subscription as expired:', sub.id);
            await supabase
              .from('push_subscriptions')
              .update({ 
                status: 'expired',
                updated_at: new Date().toISOString()
              })
              .eq('id', sub.id);
          }
          
          return { 
            success: false, 
            subscription: sub.id,
            error: error.message,
            statusCode: error.statusCode 
          };
        }
      })
    );

    console.log('[Push] Notification processing complete:', {
      total: results.length,
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length
    });

    return new Response(
      JSON.stringify({ success: true, results }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('[Push] Fatal error:', {
      message: error.message,
      stack: error.stack
    });

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
