
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    // Get active VAPID key
    const { data: vapidKey, error: vapidError } = await supabaseAdmin
      .from('vapid_keys')
      .select('public_key, private_key')
      .eq('is_active', true)
      .single();

    if (vapidError || !vapidKey) {
      console.error('[Test] No active VAPID key found:', vapidError);
      throw new Error('No active VAPID key found');
    }

    // Configure web-push
    webpush.setVapidDetails(
      'mailto:support@interpretrix.com',
      vapidKey.public_key,
      vapidKey.private_key
    );

    // Get user's push subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('interpreter_id', user.id)
      .eq('status', 'active')
      .single();

    if (subError || !subscription) {
      console.error('[Test] No active subscription found:', subError);
      throw new Error('No active push subscription found');
    }

    // Prepare notification
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    };

    const notificationPayload = {
      title: 'Test de Notification',
      body: 'Si vous voyez cette notification, le système fonctionne correctement!',
      data: {
        timestamp: new Date().toISOString(),
        type: 'test'
      }
    };

    // Send test notification
    try {
      await webpush.sendNotification(
        pushSubscription,
        JSON.stringify(notificationPayload)
      );

      // Log successful test
      await supabaseAdmin.from('notification_history').insert({
        recipient_id: user.id,
        notification_type: 'test',
        content: notificationPayload
      });

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Test notification sent successfully'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    } catch (error) {
      console.error('[Test] Error sending notification:', error);
      
      if (error.statusCode === 410) {
        // Subscription has expired
        await supabaseAdmin
          .from('push_subscriptions')
          .update({ 
            status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);
      }
      
      throw error;
    }
  } catch (error) {
    console.error('[Test] Error:', error);
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
