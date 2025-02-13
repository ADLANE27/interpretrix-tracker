
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

    // Parse request body safely
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
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!vapidPublicKey || !vapidPrivateKey || !supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables');
    }

    // Initialize web-push and Supabase client
    webPush.setVapidDetails(
      'mailto:contact@interpretix.io',
      vapidPublicKey.trim(),
      vapidPrivateKey.trim()
    );

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get active subscriptions
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('status', 'active')
      .in('interpreter_id', message.interpreterIds);

    if (subscriptionError) {
      throw new Error(`Failed to fetch subscriptions: ${subscriptionError.message}`);
    }

    if (!subscriptions?.length) {
      return new Response(
        JSON.stringify({ message: 'No active subscriptions found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }

    // Send notifications with retry logic
    const MAX_RETRIES = 3;
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        let lastError;
        
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          try {
            const subscription = {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            };

            const payload = {
              title: message.title || 'Nouvelle notification',
              body: message.body || '',
              data: message.data || {}
            };

            await webPush.sendNotification(
              subscription,
              JSON.stringify(payload)
            );

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
            
            if (error.statusCode === 410 || error.statusCode === 404) {
              // Subscription is expired or invalid
              await supabase
                .from('push_subscriptions')
                .update({ 
                  status: 'expired',
                  updated_at: new Date().toISOString()
                })
                .eq('id', sub.id);
              break;
            }
            
            // Wait before retrying (exponential backoff)
            if (attempt < MAX_RETRIES - 1) {
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
          }
        }
        
        return { 
          success: false, 
          subscriptionId: sub.id,
          error: lastError?.message,
          statusCode: lastError?.statusCode
        };
      })
    );

    // Process results
    const successfulResults = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failedResults = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));

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

    return new Response(
      JSON.stringify({ success: true, results: summary }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: summary.failed === results.length ? 502 : (summary.failed > 0 ? 207 : 200)
      }
    );
  } catch (error) {
    console.error('[Push Notification] Error:', error);
    
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
