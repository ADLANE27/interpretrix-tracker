
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import webpush from 'npm:web-push';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  interpreterIds: string[];
  title: string;
  body: string;
  data?: any;
}

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
    const payload: PushPayload = await req.json();
    const { interpreterIds, title, body, data } = payload;

    console.log('[Push] Sending notifications to interpreters:', interpreterIds);

    // Get active push subscriptions for the specified interpreters
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .in('interpreter_id', interpreterIds)
      .eq('status', 'active');

    if (subError) {
      console.error('[Push] Error fetching subscriptions:', subError);
      throw subError;
    }

    console.log('[Push] Found subscriptions:', subscriptions.length);

    // Send notifications to all subscriptions
    const notificationPromises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        const notificationPayload = {
          title,
          body,
          data: {
            ...data,
            timestamp: new Date().toISOString(),
          },
          icon: '/lovable-uploads/8277f799-8748-4846-add4-f1f81f7576d3.png',
          badge: '/lovable-uploads/8277f799-8748-4846-add4-f1f81f7576d3.png',
        };

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(notificationPayload)
        );

        console.log('[Push] Notification sent successfully to:', sub.interpreter_id);
        return { success: true, interpreter_id: sub.interpreter_id };
      } catch (error) {
        console.error('[Push] Error sending notification:', error);
        
        // If subscription is expired/invalid, mark it as expired
        if (error.statusCode === 410) {
          await supabaseAdmin
            .from('push_subscriptions')
            .update({ status: 'expired', updated_at: new Date().toISOString() })
            .eq('interpreter_id', sub.interpreter_id)
            .eq('endpoint', sub.endpoint);
        }
        
        return { success: false, interpreter_id: sub.interpreter_id, error };
      }
    });

    // Wait for all notifications to be sent
    const results = await Promise.all(notificationPromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log('[Push] Notification results:', { successful, failed });

    return new Response(
      JSON.stringify({
        success: true,
        sent: successful,
        failed,
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[Push] Fatal error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Failed to send push notifications'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
