
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
    console.log('[Push Notification] Starting push notification service');
    
    const { message } = await req.json();
    console.log('[Push Notification] Received message payload:', JSON.stringify(message, null, 2));
    
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[Push Notification] Missing VAPID keys:', { 
        hasPublicKey: !!vapidPublicKey,
        hasPrivateKey: !!vapidPrivateKey 
      });
      throw new Error('VAPID configuration missing');
    }
    
    console.log('[Push Notification] Setting VAPID details');
    webPush.setVapidDetails(
      'mailto:debassi.adlane@gmail.com',
      vapidPublicKey,
      vapidPrivateKey
    );
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[Push Notification] Missing Supabase configuration');
      throw new Error('Supabase configuration missing');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    if (!message.interpreterIds?.length) {
      console.log('[Push Notification] No interpreter IDs provided');
      return new Response(
        JSON.stringify({ message: 'No interpreter IDs provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Push Notification] Fetching active subscriptions for interpreters:', message.interpreterIds);
    
    // First, verify the mission exists and interpreters are notified
    if (message.data?.mission_id) {
      const { data: missionData, error: missionError } = await supabase
        .from('interpretation_missions')
        .select('notified_interpreters')
        .eq('id', message.data.mission_id)
        .single();

      if (missionError) {
        console.error('[Push Notification] Error fetching mission:', missionError);
        throw missionError;
      }

      console.log('[Push Notification] Mission data:', missionData);

      // If no interpreters are in the notified_interpreters array, check mission_notifications
      if (!missionData.notified_interpreters?.length) {
        const { data: notifications, error: notificationError } = await supabase
          .from('mission_notifications')
          .select('interpreter_id')
          .eq('mission_id', message.data.mission_id)
          .eq('status', 'pending');

        if (notificationError) {
          console.error('[Push Notification] Error fetching notifications:', notificationError);
          throw notificationError;
        }

        if (notifications?.length) {
          // Update the mission's notified_interpreters array
          const interpreterIds = notifications.map(n => n.interpreter_id);
          const { error: updateError } = await supabase
            .from('interpretation_missions')
            .update({ notified_interpreters: interpreterIds })
            .eq('id', message.data.mission_id);

          if (updateError) {
            console.error('[Push Notification] Error updating mission:', updateError);
            throw updateError;
          }

          console.log('[Push Notification] Updated mission notified_interpreters:', interpreterIds);
        }
      }
    }

    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('status', 'active')
      .in('interpreter_id', message.interpreterIds);
    
    if (subscriptionError) {
      console.error('[Push Notification] Error fetching subscriptions:', subscriptionError);
      throw subscriptionError;
    }

    if (!subscriptions?.length) {
      console.log('[Push Notification] No active subscriptions found for interpreters:', message.interpreterIds);
      return new Response(
        JSON.stringify({ message: 'No active subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Push Notification] Found ${subscriptions.length} active subscriptions`);
    
    const notificationPayload = {
      title: message.title || 'Nouvelle mission disponible',
      body: message.body || `${message.data?.mission_type === 'immediate' ? '🔴 Mission immédiate' : '📅 Mission programmée'} - ${message.data?.source_language} → ${message.data?.target_language} (${message.data?.estimated_duration} min)`,
      data: {
        mission_id: message.data?.mission_id,
        mission_type: message.data?.mission_type,
        source_language: message.data?.source_language,
        target_language: message.data?.target_language,
        estimated_duration: message.data?.estimated_duration,
        url: '/',
        timestamp: Date.now()
      },
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      tag: `mission-${message.data?.mission_id}`,
      renotify: true,
      requireInteraction: true,
      actions: [
        { action: 'accept', title: 'Accepter' },
        { action: 'decline', title: 'Décliner' }
      ],
      timestamp: Date.now()
    };

    console.log('[Push Notification] Sending with payload:', JSON.stringify(notificationPayload, null, 2));

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          console.log(`[Push Notification] Preparing to send to subscription ${sub.id}`);
          
          const subscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };

          console.log(`[Push Notification] Subscription details:`, subscription);

          const maxAttempts = 3;
          let attempt = 0;
          let lastError;
          
          while (attempt < maxAttempts) {
            try {
              console.log(`[Push Notification] Attempt ${attempt + 1} for subscription ${sub.id}`);
              await webPush.sendNotification(
                subscription,
                JSON.stringify(notificationPayload)
              );
              
              console.log(`[Push Notification] Successfully sent to subscription ${sub.id}`);
              
              // Update last successful push timestamp
              await supabase
                .from('push_subscriptions')
                .update({ 
                  last_successful_push: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('id', sub.id);
                
              return { success: true, subscriptionId: sub.id };
            } catch (error) {
              lastError = error;
              console.error(`[Push Notification] Attempt ${attempt + 1} failed for ${sub.id}:`, error);
              
              if (error.statusCode === 410 || error.statusCode === 404) {
                console.log(`[Push Notification] Subscription ${sub.id} is expired or invalid`);
                break; // No need to retry for invalid subscriptions
              }
              
              attempt++;
              if (attempt < maxAttempts) {
                const delay = Math.pow(2, attempt) * 1000;
                console.log(`[Push Notification] Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
          }
          
          // If we get here, all attempts failed
          if (lastError?.statusCode === 410 || lastError?.statusCode === 404) {
            console.log(`[Push Notification] Marking subscription ${sub.id} as expired`);
            await supabase
              .from('push_subscriptions')
              .update({ 
                status: 'expired',
                updated_at: new Date().toISOString()
              })
              .eq('id', sub.id);
          }
          
          throw lastError;
        } catch (error) {
          console.error(`[Push Notification] Final error for subscription ${sub.id}:`, error);
          return { 
            success: false, 
            subscriptionId: sub.id, 
            error: error.message,
            statusCode: error.statusCode 
          };
        }
      })
    );
    
    const summary = {
      total: results.length,
      successful: results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length,
      failed: results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !(r.value as any).success)).length,
      details: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason })
    };
    
    console.log('[Push Notification] Results summary:', summary);
    
    return new Response(
      JSON.stringify({ success: true, results: summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Push Notification] Unhandled error:', error);
    console.error('[Push Notification] Stack:', error.stack);
    
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
