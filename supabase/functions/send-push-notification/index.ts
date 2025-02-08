
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import webPush from 'npm:web-push';
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Push Notification] Starting push notification service');
    
    const { message, notificationData } = await req.json();
    console.log('[Push Notification] Received payload:', { message, notificationData });

    // Get VAPID keys from environment variables
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[Push Notification] Missing VAPID keys');
      throw new Error('VAPID configuration missing');
    }

    // Initialize web-push with VAPID details
    webPush.setVapidDetails(
      'mailto:your-email@example.com', // Update this email
      vapidPublicKey,
      vapidPrivateKey
    );

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[Push Notification] Missing Supabase configuration');
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get interpreter IDs to notify
    let interpreterIds = message?.interpreterIds || [];
    console.log('[Push Notification] Initial interpreter IDs:', interpreterIds);

    // If no interpreter IDs provided, check mission notifications
    if ((!interpreterIds?.length) && notificationData?.mission_id) {
      const { data: notifications, error: notificationError } = await supabase
        .from('mission_notifications')
        .select('interpreter_id')
        .eq('mission_id', notificationData.mission_id)
        .eq('status', 'pending');

      if (notificationError) {
        console.error('[Push Notification] Error fetching notifications:', notificationError);
        throw notificationError;
      }

      if (notifications?.length) {
        interpreterIds = notifications.map(n => n.interpreter_id);
        console.log('[Push Notification] Found interpreter IDs from notifications:', interpreterIds);
      }
    }

    if (!interpreterIds?.length) {
      console.log('[Push Notification] No interpreter IDs found');
      return new Response(
        JSON.stringify({ message: 'No interpreter IDs found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active push subscriptions for these interpreters
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('status', 'active')
      .in('interpreter_id', interpreterIds);

    if (subscriptionError) {
      console.error('[Push Notification] Error fetching subscriptions:', subscriptionError);
      throw subscriptionError;
    }

    if (!subscriptions?.length) {
      console.log('[Push Notification] No active subscriptions found');
      return new Response(
        JSON.stringify({ message: 'No active subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare notification payload
    const notificationPayload = {
      title: message?.title || 'Nouvelle mission disponible',
      body: message?.body || `${message?.data?.mission_type === 'immediate' ? '🔴 Mission immédiate' : '📅 Mission programmée'} - ${message?.data?.source_language} → ${message?.data?.target_language} (${message?.data?.estimated_duration} min)`,
      data: {
        mission_id: message?.data?.mission_id || notificationData?.mission_id,
        mission_type: message?.data?.mission_type || notificationData?.mission_type,
        source_language: message?.data?.source_language || notificationData?.source_language,
        target_language: message?.data?.target_language || notificationData?.target_language,
        estimated_duration: message?.data?.estimated_duration || notificationData?.estimated_duration,
        url: '/',
        timestamp: Date.now()
      },
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      tag: `mission-${message?.data?.mission_id || notificationData?.mission_id}`,
      renotify: true,
      requireInteraction: true,
      actions: [
        { action: 'accept', title: 'Accepter' },
        { action: 'decline', title: 'Décliner' }
      ]
    };

    console.log('[Push Notification] Sending notifications with payload:', notificationPayload);

    // Send notifications with retry logic
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const subscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
          try {
            console.log(`[Push Notification] Attempt ${attempts + 1} for subscription ${sub.id}`);
            
            const result = await webPush.sendNotification(
              subscription,
              JSON.stringify(notificationPayload)
            );

            // Update last successful push timestamp
            await supabase
              .from('push_subscriptions')
              .update({ 
                last_successful_push: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', sub.id);

            console.log(`[Push Notification] Successfully sent to subscription ${sub.id}`);
            return { success: true, subscriptionId: sub.id };
          } catch (error) {
            console.error(`[Push Notification] Error sending to ${sub.id}:`, error);

            if (error.statusCode === 410 || error.statusCode === 404) {
              // Subscription is expired or invalid
              await supabase
                .from('push_subscriptions')
                .update({ 
                  status: 'expired',
                  updated_at: new Date().toISOString()
                })
                .eq('id', sub.id);
              
              break; // Don't retry for invalid subscriptions
            }

            attempts++;
            if (attempts < maxAttempts) {
              const delay = Math.pow(2, attempts) * 1000; // Exponential backoff
              console.log(`[Push Notification] Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }

        return { 
          success: false, 
          subscriptionId: sub.id, 
          error: `Failed after ${attempts} attempts` 
        };
      })
    );

    // Prepare response summary
    const summary = {
      total: results.length,
      successful: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
      failed: results.filter(r => r.status === 'rejected' || !r.value.success).length,
      details: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason })
    };

    console.log('[Push Notification] Results summary:', summary);

    return new Response(
      JSON.stringify({ success: true, results: summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Push Notification] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.stack 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
