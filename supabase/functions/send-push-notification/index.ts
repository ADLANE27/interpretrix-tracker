
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
    return new Response(null, { 
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      }
    });
  }

  try {
    console.log('[Push Notification] Starting push notification service');
    
    // Validate request method
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    // Validate Content-Type
    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Content-Type must be application/json');
    }

    // Safely parse request body
    let reqBody;
    try {
      const text = await req.text();
      console.log('[Push Notification] Raw request body:', text);
      
      if (!text) {
        throw new Error('Request body is empty');
      }
      
      reqBody = JSON.parse(text);
    } catch (error) {
      console.error('[Push Notification] JSON parse error:', error);
      throw new Error(`Invalid JSON in request body: ${error.message}`);
    }
    
    // Validate message structure
    const { message } = reqBody;
    console.log('[Push Notification] Extracted message:', JSON.stringify(message));

    if (!message) {
      throw new Error('No message provided in request body');
    }

    if (!Array.isArray(message?.interpreterIds) || message.interpreterIds.length === 0) {
      throw new Error('interpreterIds must be a non-empty array');
    }

    // Get and validate environment variables
    console.log('[Push Notification] Checking environment variables');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const envCheck = {
      hasVapidPublicKey: !!vapidPublicKey,
      hasVapidPrivateKey: !!vapidPrivateKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey
    };
    
    console.log('[Push Notification] Environment check:', envCheck);
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID configuration missing');
    }

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    // Initialize web-push with VAPID details
    try {
      console.log('[Push Notification] Initializing web-push');
      webPush.setVapidDetails(
        'mailto:contact@interpretix.io',
        vapidPublicKey.trim(),
        vapidPrivateKey.trim()
      );
      console.log('[Push Notification] web-push initialized successfully');
    } catch (error) {
      console.error('[Push Notification] Error initializing web-push:', error);
      throw new Error(`Failed to initialize push service: ${error.message}`);
    }

    // Initialize Supabase client
    console.log('[Push Notification] Initializing Supabase client');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get active subscriptions for these interpreters
    console.log('[Push Notification] Fetching subscriptions for interpreters:', message.interpreterIds);
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('status', 'active')
      .in('interpreter_id', message.interpreterIds);

    if (subscriptionError) {
      console.error('[Push Notification] Subscription error:', subscriptionError);
      throw new Error(`Failed to fetch subscriptions: ${subscriptionError.message}`);
    }

    if (!subscriptions?.length) {
      console.log('[Push Notification] No active subscriptions found for interpreters:', message.interpreterIds);
      return new Response(
        JSON.stringify({ message: 'No active subscriptions found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }

    console.log('[Push Notification] Found subscriptions:', {
      count: subscriptions.length,
      subscriptionIds: subscriptions.map(s => s.id)
    });

    // Send notifications
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

          console.log('[Push Notification] Preparing notification for subscription:', {
            id: sub.id,
            endpoint: subscription.endpoint
          });

          const payload = {
            title: message.title || 'Nouvelle notification',
            body: message.body || '',
            data: message.data || {}
          };

          console.log('[Push Notification] Notification payload:', payload);

          await webPush.sendNotification(
            subscription,
            JSON.stringify(payload)
          );

          console.log('[Push Notification] Successfully sent to subscription:', sub.id);

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
          console.error(`[Push Notification] Error sending to ${sub.id}:`, error);

          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`[Push Notification] Marking subscription ${sub.id} as expired`);
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
            error: error.message,
            statusCode: error.statusCode
          };
        }
      })
    );

    // Analyse des résultats
    const successfulResults = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failedResults = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));

    // Préparer le résumé
    const summary = {
      total: results.length,
      successful: successfulResults.length,
      failed: failedResults.length,
      details: results.map(r => {
        if (r.status === 'fulfilled') {
          return r.value;
        } else {
          return {
            success: false,
            error: r.reason?.message || 'Unknown error',
            stack: r.reason?.stack
          };
        }
      })
    };

    console.log('[Push Notification] Notification results:', summary);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: summary 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: summary.failed > 0 ? 207 : 200
      }
    );
  } catch (error) {
    console.error('[Push Notification] Error:', error);
    console.error('[Push Notification] Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.stack,
        type: error.constructor.name
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
