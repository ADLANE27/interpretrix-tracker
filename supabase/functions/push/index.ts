
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js';
import webPush from 'npm:web-push';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data?: any;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: Notification;
  schema: 'public';
  old_record: null | Notification;
}

serve(async (req) => {
  try {
    console.log('[Push Webhook] Function called');
    
    // Log request headers for debugging
    console.log('[Push Webhook] Request headers:', Object.fromEntries(req.headers.entries()));

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!supabaseUrl || !supabaseKey || !vapidPublicKey || !vapidPrivateKey) {
      console.error('[Push Webhook] Missing environment variables:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        hasVapidPublic: !!vapidPublicKey,
        hasVapidPrivate: !!vapidPrivateKey
      });
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse webhook payload
    const rawBody = await req.text();
    console.log('[Push Webhook] Raw request body:', rawBody);
    
    const payload: WebhookPayload = JSON.parse(rawBody);
    console.log('[Push Webhook] Parsed payload:', payload);

    if (payload.type !== 'INSERT') {
      console.log('[Push Webhook] Ignoring non-INSERT event');
      return new Response(JSON.stringify({ message: 'Ignored non-INSERT event' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Configure Web Push
    webPush.setVapidDetails(
      'mailto:contact@interpretix.io',
      vapidPublicKey,
      vapidPrivateKey
    );

    // Get user's push subscriptions
    console.log('[Push Webhook] Fetching subscriptions for user:', payload.record.user_id);
    
    const { data: subscriptions, error: dbError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('interpreter_id', payload.record.user_id)
      .eq('status', 'active');

    if (dbError) {
      console.error('[Push Webhook] Database error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log('[Push Webhook] Found subscriptions:', subscriptions);

    if (!subscriptions?.length) {
      console.log('[Push Webhook] No active subscriptions found for user:', payload.record.user_id);
      return new Response(
        JSON.stringify({ message: 'No active subscriptions found' }),
        { 
          headers: { 'Content-Type': 'application/json' },
          status: 404 
        }
      );
    }

    // Send notifications to all user's subscriptions
    console.log('[Push Webhook] Attempting to send notifications to', subscriptions.length, 'subscriptions');
    
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

          const notificationPayload = JSON.stringify({
            title: payload.record.title,
            body: payload.record.body,
            data: {
              ...payload.record.data,
              notificationId: payload.record.id
            }
          });

          console.log('[Push Webhook] Sending to:', sub.endpoint, 'with payload:', notificationPayload);
          
          await webPush.sendNotification(subscription, notificationPayload);
          console.log('[Push Webhook] Successfully sent to:', sub.endpoint);

          // Update last successful push
          const { error: updateError } = await supabase
            .from('push_subscriptions')
            .update({
              last_successful_push: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', sub.id);

          if (updateError) {
            console.error('[Push Webhook] Error updating subscription:', updateError);
          }

          return { success: true, subscriptionId: sub.id };
        } catch (error) {
          console.error('[Push Webhook] Send error for endpoint:', sub.endpoint, error);

          // If subscription is expired/invalid, update its status
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log('[Push Webhook] Marking subscription as expired:', sub.id);
            const { error: updateError } = await supabase
              .from('push_subscriptions')
              .update({
                status: 'expired',
                updated_at: new Date().toISOString()
              })
              .eq('id', sub.id);

            if (updateError) {
              console.error('[Push Webhook] Error updating expired subscription:', updateError);
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

    console.log('[Push Webhook] Final results:', JSON.stringify(summary, null, 2));

    return new Response(
      JSON.stringify({ success: true, results: summary }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[Push Webhook] Critical error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
