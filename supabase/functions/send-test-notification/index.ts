
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const requestBody = await req.text();
    console.log('[Test Notification] Received request body:', requestBody);

    let interpreterId;
    try {
      const parsed = JSON.parse(requestBody);
      interpreterId = parsed.interpreterId;
    } catch (e) {
      console.error('[Test Notification] Error parsing request body:', e);
      throw new Error('Invalid request body');
    }

    if (!interpreterId) {
      throw new Error('Interpreter ID is required');
    }

    console.log('[Test Notification] Sending test notification to:', interpreterId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Call send-push-notification with test notification data
    console.log('[Test Notification] Invoking send-push-notification function');
    
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        interpreterIds: [interpreterId],
        title: '🔔 Test des notifications',
        body: 'Bravo ! Les notifications sont maintenant activées sur votre appareil.',
        data: { 
          type: 'test',
          timestamp: new Date().toISOString()
        }
      }
    });

    if (error) {
      console.error('[Test Notification] Error:', error);
      throw error;
    }

    console.log('[Test Notification] Success:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[Test Notification] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
