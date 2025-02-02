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
    const { message } = await req.json();
    console.log('[Push Notification] Received request:', { 
      title: message.title,
      interpreterIds: message.interpreterIds?.length,
      type: message.data?.type 
    });
    
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[Push Notification] Missing VAPID keys');
      throw new Error('VAPID configuration missing');
    }
    
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

    console.log('[Push Notification] Fetching subscriptions for interpreters:', message.interpreterIds);
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
      console.log('[Push Notification] No active subscriptions found');
      return new Response(
        JSON.stringify({ message: 'No active subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Push Notification] Found ${subscriptions.length} active subscriptions`);
    
    const notificationPayload = {
      title: message.title,
      body: message.body,
      icon: message.icon,
      data: message.data,
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      requireInteraction: true,
      actions: [
        { action: 'accept', title: 'Accepter' },
        { action: 'decline', title: 'Décliner' }
      ],
      timestamp: Date.now()
    };

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          console.log(`[Push Notification] Sending to subscription ${sub.id}`);
          
          const maxAttempts = 3;
          let attempt = 0;
          
          while (attempt < maxAttempts) {
            try {
              await webPush.sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                  }
                },
                JSON.stringify(notificationPayload)
              );
              
              console.log(`[Push Notification] Successfully sent to subscription ${sub.id}`);
              
              await supabase
                .from('push_subscriptions')
                .update({ 
                  last_successful_push: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('id', sub.id);
                
              return { success: true, subscriptionId: sub.id };
            } catch (error) {
              attempt++;
              if (attempt === maxAttempts) throw error;
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
            }
          }
        } catch (error) {
          console.error(`[Push Notification] Failed for subscription ${sub.id}:`, error);
          
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`[Push Notification] Subscription ${sub.id} expired, updating status`);
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
            subscriptionId: sub.id, 
            error: error.message 
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
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});