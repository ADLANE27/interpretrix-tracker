
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import webpush from 'npm:web-push';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get VAPID keys
    const { data: vapidData, error: vapidError } = await supabaseAdmin
      .from('vapid_keys')
      .select('public_key, private_key')
      .eq('is_active', true)
      .single();

    if (vapidError || !vapidData) {
      console.error('[Push] Error getting VAPID keys:', vapidError);
      throw new Error('Could not get VAPID keys');
    }

    // Set up web-push with VAPID keys
    webpush.setVapidDetails(
      'mailto:support@interpretrix.com',
      vapidData.public_key,
      vapidData.private_key
    );

    // Get request payload
    const { interpreterId } = await req.json();

    console.log('[Push] Sending test notification to interpreter:', interpreterId);

    // Get interpreter's subscription
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('interpreter_id', interpreterId)
      .eq('status', 'active');

    if (subError) {
      console.error('[Push] Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions?.length) {
      throw new Error('No active subscriptions found for interpreter');
    }

    // Send notifications to all subscriptions
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        const notificationPayload = {
          title: 'Test de notification',
          body: 'Cette notification confirme que les notifications push fonctionnent correctement.',
          data: {
            timestamp: new Date().toISOString(),
            type: 'test'
          },
          icon: '/lovable-uploads/8277f799-8748-4846-add4-f1f81f7576d3.png',
          badge: '/lovable-uploads/8277f799-8748-4846-add4-f1f81f7576d3.png',
        };

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(notificationPayload)
        );

        console.log('[Push] Test notification sent successfully to:', interpreterId);
        return { success: true };
      } catch (error: any) {
        console.error('[Push] Error sending test notification:', error);
        
        if (error.statusCode === 410) {
          // Subscription has expired
          await supabaseAdmin
            .from('push_subscriptions')
            .update({ status: 'expired', updated_at: new Date().toISOString() })
            .eq('interpreter_id', interpreterId)
            .eq('endpoint', sub.endpoint);
        }
        
        return { success: false, error };
      }
    });

    const results = await Promise.all(sendPromises);
    const successful = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({
        success: successful > 0,
        sent: successful,
        total: results.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: successful > 0 ? 200 : 500
      }
    );

  } catch (error) {
    console.error('[Push] Fatal error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Failed to send test notification'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
