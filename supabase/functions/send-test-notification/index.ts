
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import webPush from 'npm:web-push';
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { interpreterId } = await req.json();
    
    if (!interpreterId) {
      throw new Error('Interpreter ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get active VAPID keys
    const { data: vapidKeys, error: vapidError } = await supabase
      .from('vapid_keys')
      .select('public_key, private_key')
      .eq('is_active', true)
      .single();

    if (vapidError || !vapidKeys) {
      console.error('[Push] Error getting VAPID keys:', vapidError);
      throw new Error('Could not get VAPID keys');
    }

    // Configure web-push with VAPID keys
    webPush.setVapidDetails(
      'mailto:contact@interpretix.io',
      vapidKeys.public_key,
      vapidKeys.private_key
    );

    // Get active subscriptions for the interpreter
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('interpreter_id', interpreterId)
      .eq('status', 'active');

    if (subError) {
      console.error('[Push] Error getting subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No active subscriptions found',
          success: false 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      );
    }

    // Send test notification to all active subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };

          await webPush.sendNotification(
            pushSubscription,
            JSON.stringify({
              title: '👋 Test de notification',
              body: 'Les notifications push sont maintenant activées !',
              data: {
                timestamp: new Date().toISOString()
              }
            })
          );

          // Update last successful push timestamp
          await supabase
            .from('push_subscriptions')
            .update({ 
              last_successful_push: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', sub.id);

          return { success: true, subscription: sub.id };
        } catch (error: any) {
          console.error('[Push] Error sending notification:', error);

          // Handle expired subscriptions
          if (error.statusCode === 410 || error.statusCode === 404) {
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        metadata: {
          totalSubscriptions: subscriptions.length,
          timestamp: new Date().toISOString()
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('[Push] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
