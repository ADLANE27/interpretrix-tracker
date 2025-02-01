import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import webPush from 'npm:web-push';
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Enhanced CORS handling
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    console.log('[Edge Function] Received push notification request:', message);
    
    // Validate VAPID keys
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[Edge Function] VAPID keys not found');
      throw new Error('VAPID keys not configured');
    }
    
    // Configure web push
    webPush.setVapidDetails(
      'mailto:debassi.adlane@gmail.com',
      vapidPublicKey,
      vapidPrivateKey
    );
    
    // Enhanced Supabase client initialization
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get active subscriptions
    console.log('[Edge Function] Fetching active subscriptions for interpreters:', message.interpreterIds);
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('status', 'active')
      .in('interpreter_id', message.interpreterIds || []);
    
    if (subscriptionError) {
      console.error('[Edge Function] Error fetching subscriptions:', subscriptionError);
      throw subscriptionError;
    }

    if (!subscriptions?.length) {
      console.log('[Edge Function] No active subscriptions found');
      return new Response(
        JSON.stringify({ message: 'No active subscriptions found' }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          },
          status: 200 
        }
      );
    }

    console.log(`[Edge Function] Found ${subscriptions.length} active subscriptions`);
    
    // Enhanced notification sending with better error handling and retry logic
    const notificationResults = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          console.log(`[Edge Function] Sending notification to subscription ${sub.id}`);
          const payload = JSON.stringify({
            title: message.title,
            body: message.body,
            icon: message.icon,
            data: message.data,
            badge: '/favicon.ico',
            vibrate: [200, 100, 200],
            requireInteraction: true,
            actions: [
              {
                action: 'accept',
                title: 'Accepter'
              },
              {
                action: 'decline',
                title: 'Décliner'
              }
            ],
            timestamp: Date.now()
          });
          
          // Implement retry logic with exponential backoff
          let attempt = 0;
          const maxAttempts = 3;
          
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
                payload
              );
              
              console.log(`[Edge Function] Successfully sent notification to subscription ${sub.id}`);
              
              // Update last successful push
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
              // Exponential backoff: 1s, 2s, 4s
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
            }
          }
        } catch (error) {
          console.error(`[Edge Function] Failed to send notification to subscription ${sub.id}:`, error);
          
          // Handle expired subscriptions
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`[Edge Function] Subscription ${sub.id} is expired or invalid, updating status`);
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
    
    // Analyze results
    const results = {
      total: notificationResults.length,
      successful: notificationResults.filter(r => r.status === 'fulfilled' && (r.value as any).success).length,
      failed: notificationResults.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !(r.value as any).success)).length,
      details: notificationResults.map(r => {
        if (r.status === 'fulfilled') {
          return r.value;
        } else {
          return { success: false, error: r.reason };
        }
      })
    };
    
    console.log('[Edge Function] Notification results:', results);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        results 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 200 
      }
    );
  } catch (error) {
    console.error('[Edge Function] Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 500
      }
    );
  }
});